import { PARAMETRES_CLASSEMENT_PAR_DEFAUT } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { connecter, creerCompte, demarrer, inscrire, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;
let admin: string;

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
  const a = await creerCompte(prisma, "ADMIN", { email: "michel@cabinet.cm" });
  admin = await connecter(app, a.email!);
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

const etape = (cookie: string, nom: string, donnees: object) =>
  app.inject({ method: "PUT", url: `/candidat/dossier/etapes/${nom}`, payload: { donnees, terminer: true }, headers: { cookie } });

/** Crée un candidat au dossier complet et envoyé : diplôme, TCF 450, BTP 6-10 ans, bureautique « Bon » → grade B. */
async function candidatB(email: string, envoyer = true) {
  const cookie = await inscrire(app, email);
  const l = (await app.inject({ method: "GET", url: "/referentiels" })).json();
  const id = (liste: { id: string; nom: string }[], nom: string) => liste.find((x) => x.nom === nom)!.id;
  await etape(cookie, "PERSONNEL", {
    nom: "Ngono", prenoms: "Awa", dateNaissance: "1995-04-12", sexe: "FEMME", nationalite: "Camerounaise",
    ville: "Douala", telephoneContact: "699001122", languesParlees: ["Français"], aPasseport: false,
  });
  await etape(cookie, "DIPLOME", {
    aDiplome: true, diplomeId: id(l.diplomes, "BTS/DUT"), diplomeIntitule: "BTS Génie civil", etablissement: "IUT", diplomeAnnee: 2018, diplomePays: "Cameroun",
  });
  await etape(cookie, "LANGUES", { aTestLangue: true, testLangueId: id(l.testsLangue, "TCF Canada"), testScore: 450, testDate: "2025-06-01" });
  await etape(cookie, "TRAVAIL", {
    aTravaille: true, domaineId: id(l.domaines, "BTP"), metier: "Maçon", trancheExperience: "ANS_6_10", bureautique: "BON",
    experiences: [{ employeur: "Sogea", poste: "Maçon", debut: "2015-01", fin: null, ville: "Douala" }],
  });
  await etape(cookie, "FAMILLE", { situation: "CELIBATAIRE", enfants: "AUCUN", partAvecAccompagnants: false });
  if (envoyer) {
    const r = await app.inject({ method: "POST", url: "/candidat/dossier/envoyer", payload: { certifie: true }, headers: { cookie } });
    expect(r.statusCode).toBe(200);
  }
  const dossier = await prisma.dossier.findFirstOrThrow({ where: { utilisateur: { email } } });
  return { cookie, dossierId: dossier.id };
}
const classement = async (cookie: string) => (await app.inject({ method: "GET", url: "/candidat/classement", headers: { cookie } })).json();
const service = async (nom: string) => prisma.service.findFirstOrThrow({ where: { nom } });
const changerService = (dossierId: string, serviceId: string, etat: string) =>
  app.inject({ method: "PUT", url: `/admin/dossiers/${dossierId}/services/${serviceId}`, payload: { etat }, headers: { cookie: admin } });
const verifierPieces = (dossierId: string) =>
  Promise.all(
    (["IDENTITE", "DIPLOME", "ATTESTATION_LANGUE"] as const).map(async (type) => {
      const f = await prisma.fichier.create({ data: { contenu: new Uint8Array([1]), typeMime: "application/pdf", taille: 1, empreinte: type } });
      await prisma.piece.create({ data: { dossierId, type, etat: "VERIFIEE", fichierId: f.id, nomFichier: `${type}.pdf` } });
    }),
  );

describe("Grade du candidat (W3)", () => {
  it("n'est affiché qu'une fois le formulaire terminé", async () => {
    const cookie = await inscrire(app, "x@b.cm");
    expect((await classement(cookie)).disponible).toBe(false);
  });

  it("est calculé à chaque modification, avec l'explication et les services suggérés", async () => {
    const { cookie } = await candidatB("awa@b.cm");
    const c = await classement(cookie);
    expect(c).toMatchObject({ disponible: true, grade: "B", etat: "PROVISOIRE", regle: "R-02" });
    expect(c.elements.map((e: { element: string }) => e.element)).toEqual(["DIPLOME", "TEST_LANGUE", "COACHING", "NIVEAU"]);
    expect(c.elements.find((e: { element: string }) => e.element === "COACHING").etat).toBe("MANQUANT");
    const coaching = c.services.find((s: { nom: string }) => s.nom === "Coaching");
    expect(coaching).toMatchObject({ suggere: true, etat: "SUGGERE" });
    expect(c.services.filter((s: { suggere: boolean }) => s.suggere)).toHaveLength(1);
  });
});

describe("Services (W4)", () => {
  it("« Je suis intéressé » : état Intéressé et administrateurs prévenus", async () => {
    const { cookie } = await candidatB("awa@b.cm");
    const coaching = await service("Coaching");
    const r = await app.inject({ method: "POST", url: `/candidat/services/${coaching.id}/interet`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.json().services.find((s: { id: string }) => s.id === coaching.id).etat).toBe("INTERESSE");
    // La réponse garde le grade affichable (même forme que GET /candidat/classement).
    expect(r.json().disponible).toBe(true);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { contains: "Intérêt" } } })).toBe(1);
  });

  it("le candidat ne peut pas faire avancer un service lui-même", async () => {
    const { cookie, dossierId } = await candidatB("awa@b.cm");
    const coaching = await service("Coaching");
    const r = await app.inject({ method: "PUT", url: `/admin/dossiers/${dossierId}/services/${coaching.id}`, payload: { etat: "REALISE" }, headers: { cookie } });
    expect(r.statusCode).toBe(403);
  });

  it("B + coaching réalisé → A provisoire, à confirmer ; annulé → redevient suggéré, retour en B", async () => {
    const { cookie, dossierId } = await candidatB("awa@b.cm");
    const coaching = await service("Coaching");
    expect((await changerService(dossierId, coaching.id, "ACCEPTE")).statusCode).toBe(200);
    expect((await changerService(dossierId, coaching.id, "EN_COURS")).statusCode).toBe(200);
    const realise = await changerService(dossierId, coaching.id, "REALISE");
    expect(realise.json()).toMatchObject({ grade: "A", etat: "PROVISOIRE" });
    expect((await changerService(dossierId, coaching.id, "ACCEPTE")).statusCode).toBe(409);

    const annule = await changerService(dossierId, coaching.id, "ANNULE");
    expect(annule.json().grade).toBe("B");
    expect((await classement(cookie)).services.find((s: { id: string }) => s.id === coaching.id)).toMatchObject({ etat: "SUGGERE", suggere: true });
  });

  it("T7 — C, puis test de langue et mise à niveau réalisés → B, seul le coaching suggéré", async () => {
    const { cookie, dossierId } = await candidatB("awa@b.cm");
    await etape(cookie, "LANGUES", { aTestLangue: false });
    await app.inject({ method: "PUT", url: `/admin/dossiers/${dossierId}/niveau`, payload: { niveau: "INSUFFISANT" }, headers: { cookie: admin } });
    expect((await classement(cookie)).grade).toBe("C");
    await changerService(dossierId, (await service("Formation aux tests de langue")).id, "REALISE");
    await changerService(dossierId, (await service("Séances de mise à niveau")).id, "REALISE");
    const c = await classement(cookie);
    expect(c.grade).toBe("B");
    expect(c.services.filter((s: { suggere: boolean }) => s.suggere).map((s: { nom: string }) => s.nom)).toEqual(["Coaching"]);
  });
});

describe("Confirmation et correction (W6)", () => {
  it("T9 — confirmer un A sans pièces vérifiées est refusé, avec la liste des pièces", async () => {
    const { dossierId } = await candidatB("awa@b.cm");
    await changerService(dossierId, (await service("Coaching")).id, "REALISE");
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect(r.statusCode).toBe(409);
    expect(Object.keys(r.json().erreur.details).sort()).toEqual(["ATTESTATION_LANGUE", "DIPLOME", "IDENTITE"]);

    await verifierPieces(dossierId);
    const ok = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect(ok.json()).toMatchObject({ grade: "A", etat: "CONFIRME" });
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "awa@b.cm", texte: { contains: "confirmé ton grade" } } })).toBe(1);
    expect(await prisma.journal.count({ where: { action: "GRADE_CONFIRME", cibleId: dossierId } })).toBe(1);
  });

  it("T14 — grade confirmé puis dossier modifié : repasse en provisoire, alerte aux administrateurs", async () => {
    const { cookie, dossierId } = await candidatB("awa@b.cm");
    await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect((await classement(cookie)).etat).toBe("CONFIRME");

    await etape(cookie, "FAMILLE", { situation: "CELIBATAIRE", enfants: "UN", partAvecAccompagnants: false });
    const c = await classement(cookie);
    expect(c).toMatchObject({ etat: "PROVISOIRE", alerte: true });
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { contains: "Grade à revoir" } } })).toBe(1);
  });

  it("correction : raison obligatoire, grade figé jusqu'à libération ou modification du candidat", async () => {
    const { cookie, dossierId } = await candidatB("awa@b.cm");
    const sansRaison = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/corriger`, payload: { grade: "C", raison: "" }, headers: { cookie: admin } });
    expect(sansRaison.statusCode).toBe(400);
    const corrige = await app.inject({
      method: "POST",
      url: `/admin/dossiers/${dossierId}/grade/corriger`,
      payload: { grade: "C", raison: "Entretien : niveau de français oral insuffisant" },
      headers: { cookie: admin },
    });
    expect(corrige.json()).toMatchObject({ grade: "C", gradeCalcule: "B", etat: "CORRIGE" });
    expect(await prisma.journal.count({ where: { action: "GRADE_CORRIGE", cibleId: dossierId } })).toBe(1);

    // Une action du cabinet ne libère pas un grade corrigé.
    await app.inject({ method: "PUT", url: `/admin/dossiers/${dossierId}/niveau`, payload: { niveau: "SUFFISANT" }, headers: { cookie: admin } });
    expect((await classement(cookie)).etat).toBe("CORRIGE");

    const libere = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/liberer`, headers: { cookie: admin } });
    expect(libere.json()).toMatchObject({ grade: "B", etat: "PROVISOIRE" });
  });

  it("un dossier en brouillon ne peut pas être confirmé", async () => {
    const { dossierId } = await candidatB("awa@b.cm", false);
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect(r.statusCode).toBe(409);
  });

  it("garde l'historique complet des grades", async () => {
    const { dossierId } = await candidatB("awa@b.cm");
    await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/grade/confirmer`, headers: { cookie: admin } });
    const r = (await app.inject({ method: "GET", url: `/admin/dossiers/${dossierId}/classement`, headers: { cookie: admin } })).json();
    expect(r.historique[0]).toMatchObject({ etat: "CONFIRME", grade: "B" });
    expect(r.historique.length).toBeGreaterThan(1);
  });
});

describe("Paramètres du classement", () => {
  it("T15 — un seuil modifié recalcule tous les grades provisoires (pas les grades confirmés)", async () => {
    const a = await candidatB("a@b.cm");
    const b = await candidatB("b@b.cm");
    const confirme = await candidatB("c@b.cm");
    await app.inject({ method: "POST", url: `/admin/dossiers/${confirme.dossierId}/grade/confirmer`, headers: { cookie: admin } });

    const r = await app.inject({
      method: "PUT",
      url: "/admin/parametres-classement",
      payload: { ...PARAMETRES_CLASSEMENT_PAR_DEFAUT, experienceMinimumAnnees: 10 },
      headers: { cookie: admin },
    });
    expect(r.statusCode).toBe(200);
    expect((await classement(a.cookie)).grade).toBe("C");
    expect((await classement(b.cookie)).grade).toBe("C");
    expect(await classement(confirme.cookie)).toMatchObject({ grade: "B", etat: "CONFIRME" });
  });
});
