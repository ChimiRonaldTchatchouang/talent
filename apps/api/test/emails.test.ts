import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "../src/app.js";
import { lireConfig } from "../src/lib/config.js";
import { envoyerEmail, EXPEDITEUR_TEST_RESEND, modeles } from "../src/lib/emails.js";
import { rendreEmail, type Message } from "../src/lib/gabarit-email.js";
import { ecrireReglages } from "../src/lib/reglages.js";
import { demarrer, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;
const base = { NODE_ENV: "test", DATABASE_URL: "postgresql://x", URL_SITE: "https://ginfos.site" } as const;
const message = modeles.test("https://ginfos.site/admin");
const ctx = { urlSite: "https://ginfos.site", telephoneCabinet: "+237 6 70 00 00 00", emailCabinet: "contact@ginfos.site" };

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe("Envoi des e-mails par Resend", () => {
  it("sans clé : mode démo, rien n'est envoyé, mais l'e-mail (HTML et texte) est gardé pour l'aperçu", async () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig(base), "awa@exemple.cm", message);
    expect(appel).not.toHaveBeenCalled();
    const e = await prisma.emailEnvoye.findFirstOrThrow();
    expect(e.statut).toBe("DEMO");
    expect(e.html).toContain("<!DOCTYPE html>");
    expect(e.texte).toContain("L'envoi des e-mails fonctionne");
  });

  it("avec la clé seule : HTML + texte, expéditeur de test, identifiant unique anti-regroupement", async () => {
    const appel = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_cle_de_test" }), "awa@exemple.cm", message);
    const [url, options] = appel.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers.Authorization).toBe("Bearer re_cle_de_test");
    const corps = JSON.parse(options.body);
    expect(corps).toMatchObject({ from: EXPEDITEUR_TEST_RESEND, to: ["awa@exemple.cm"], subject: message.sujet });
    expect(corps.html).toContain("<!DOCTYPE html>");
    expect(corps.text).toContain("L'envoi des e-mails fonctionne");
    expect(corps.headers["X-Entity-Ref-ID"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(corps.reply_to).toBeUndefined();
    expect((await prisma.emailEnvoye.findFirstOrThrow()).statut).toBe("ENVOYE");
  });

  it("utilise l'adresse du cabinet comme expéditeur, et son e-mail comme adresse de réponse", async () => {
    await ecrireReglages(prisma, { telephoneCabinet: null, emailCabinet: "contact@ginfos.site" });
    const appel = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_x", EMAIL_EXPEDITEUR: "Bassin de Talents <noreply@ginfos.site>" }), "awa@exemple.cm", message);
    const corps = JSON.parse(appel.mock.calls[0]![1].body);
    expect(corps.from).toBe("Bassin de Talents <noreply@ginfos.site>");
    expect(corps.reply_to).toBe("contact@ginfos.site");
  });

  it("un refus de Resend est noté dans le journal des e-mails sans bloquer l'action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"domain not verified"}', { status: 403 })));
    await expect(envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_x" }), "awa@exemple.cm", message)).resolves.toBeUndefined();
    const e = await prisma.emailEnvoye.findFirstOrThrow();
    expect(e.statut).toBe("ECHEC");
    expect(e.erreur).toContain("domain not verified");
  });
});

describe("Gabarit des e-mails", () => {
  it("échappe tout contenu saisi par un utilisateur (pas d'injection de HTML)", () => {
    const { html } = rendreEmail(modeles.pieceRefusee({ piece: "CV", motif: '<script>alert("x")</script> & <b>gras</b>', lien: "https://ginfos.site/candidat" }), ctx);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; &lt;b&gt;");
  });

  it("contient l'aperçu, le bouton, le lien de secours, le pied (raison de l'envoi, coordonnées du cabinet)", () => {
    const { html, texte } = rendreEmail(modeles.motDePasseOublie("https://ginfos.site/reinitialiser?jeton=abc"), ctx);
    expect(html).toContain("Ce lien est valable 1 heure");
    expect(html.match(/https:\/\/ginfos\.site\/reinitialiser\?jeton=abc/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Tu reçois cet e-mail parce que tu as un compte");
    expect(html).toContain("+237 6 70 00 00 00");
    expect(html).not.toMatch(/<img/i); // aucune image distante
    expect(texte).toContain("Choisir un nouveau mot de passe : https://ginfos.site/reinitialiser?jeton=abc");
  });

  it("tutoie le candidat et vouvoie le cabinet et le recruteur", () => {
    expect(rendreEmail(modeles.suppressionEffectuee(), ctx).texte).toContain("À bientôt,");
    expect(rendreEmail(modeles.demandeSuppression({ demandeLe: new Date(), lien: "x" }), ctx).texte).toContain("Cordialement,");
    expect(rendreEmail(modeles.demandeSuppression({ demandeLe: new Date(), lien: "x" }), ctx).html).toContain("Vous recevez cet e-mail en tant qu&#39;administrateur");
  });

  it("chaque modèle produit un e-mail complet et léger (sous la limite de coupure de Gmail)", () => {
    const d = new Date("2026-11-02T00:00:00Z");
    const tous: Message[] = [
      modeles.compteCree("https://s/c?jeton=a", "https://s/candidat"),
      modeles.confirmationEmail("https://s/c?jeton=a"),
      modeles.motDePasseOublie("https://s/r?jeton=a"),
      modeles.dossierEnvoyeCandidat({ envoyeLe: d, piecesManquantes: ["DIPLOME", "CV"], lienEspace: "https://s/candidat" }),
      modeles.pieceRefusee({ piece: "IDENTITE", motif: "Document illisible ou flou", lien: "https://s/j" }),
      modeles.gradeMisAJour({ grade: "A", corrige: false, lien: "https://s/g" }),
      modeles.suppressionEffectuee(),
      modeles.dossierEnvoyeAdmin({ nom: "Awa Ngono", metier: "Maçonne", ville: "Douala", grade: "B", piecesManquantes: 2, lien: "https://s/a" }),
      modeles.gradeARevoir({ nom: "Awa Ngono", avant: "A", etatAvant: "confirmé", apres: "B", lien: "https://s/a" }),
      modeles.interetService({ nom: "Awa Ngono", service: "Coaching", grade: "B", lien: "https://s/a" }),
      modeles.selectionRecue({ recruteur: "Julie", entreprise: "Bâtir", pays: "Canada", profils: 3, remplace: true, lien: "https://s/s" }),
      modeles.finAccesProche({ recruteur: "Julie", entreprise: "Bâtir", pays: "Canada", dateFin: d, lien: "https://s/r" }),
      modeles.demandeSuppression({ demandeLe: d, lien: "https://s/x" }),
      modeles.test("https://s/admin"),
      modeles.identifiantsRecruteur({ nom: "Julie", email: "j@b.ca", motDePasse: "abc123", dateFin: d, lien: "https://s/connexion", nouveau: false }),
    ];
    for (const m of tous) {
      const { html, texte } = rendreEmail(m, ctx);
      expect(html.length).toBeLessThan(40_000);
      expect(m.sujet).not.toMatch(/!|[A-Z]{5,}/); // pas de cris ni de points d'exclamation dans les sujets
      expect(texte).toContain(m.titre);
      expect(html).toContain(m.titre.replace(/'/g, "&#39;"));
    }
  });
});
