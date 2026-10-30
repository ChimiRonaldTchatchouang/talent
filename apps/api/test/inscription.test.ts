import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { connecter, creerCompte, demarrer, inscrire, jetonDuDernierEmail, MOT_DE_PASSE, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

const inscription = (payload: object) => app.inject({ method: "POST", url: "/auth/inscription", payload });

describe("Inscription du candidat (W1)", () => {
  it("crée le compte, le dossier en brouillon, ouvre la session et envoie l'e-mail de confirmation", async () => {
    const cookie = await inscrire(app, "Awa@Exemple.cm");
    const moi = (await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).json().utilisateur;
    expect(moi).toMatchObject({ role: "CANDIDAT", email: "awa@exemple.cm", emailConfirme: false });

    const dossier = await prisma.dossier.findFirstOrThrow({ where: { utilisateur: { email: "awa@exemple.cm" } } });
    expect(dossier.statut).toBe("BROUILLON");
    expect(dossier.consentementTraitementLe).toBeInstanceOf(Date);
    expect(dossier.emailContact).toBe("awa@exemple.cm");

    const email = await prisma.emailEnvoye.findFirstOrThrow({ where: { destinataire: "awa@exemple.cm" } });
    expect(email.statut).toBe("DEMO");
    expect(email.texte).toContain("/confirmer-email?jeton=");

    const jeton = await jetonDuDernierEmail(prisma, "awa@exemple.cm");
    const conf = await app.inject({ method: "POST", url: "/auth/confirmer-email", payload: { jeton } });
    expect(conf.statusCode).toBe(200);
    const apres = (await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).json().utilisateur;
    expect(apres.emailConfirme).toBe(true);
    // Un lien ne sert qu'une fois.
    expect((await app.inject({ method: "POST", url: "/auth/confirmer-email", payload: { jeton } })).statusCode).toBe(400);
  });

  it("accepte un numéro de téléphone sans indicatif", async () => {
    await inscrire(app, "6 99 00 11 22");
    const u = await prisma.utilisateur.findUniqueOrThrow({ where: { telephone: "+237699001122" } });
    expect(u.email).toBeNull();
    expect(await prisma.emailEnvoye.count()).toBe(0);
  });

  it("T13 — refuse une deuxième inscription avec le même numéro", async () => {
    await inscrire(app, "699001122");
    const rep = await inscription({ identifiant: "+237 699 00 11 22", motDePasse: MOT_DE_PASSE, consentementTraitement: true, consentementRecruteurs: false });
    expect(rep.statusCode).toBe(409);
    expect(rep.json().erreur.message).toBe("Ce numéro a déjà un compte. Connecte-toi ou contacte le cabinet.");
    expect(await prisma.utilisateur.count({ where: { telephone: "+237699001122" } })).toBe(1);
  });

  it("refuse une deuxième inscription avec le même e-mail, quelle que soit la casse", async () => {
    await inscrire(app, "awa@exemple.cm");
    const rep = await inscription({ identifiant: "AWA@exemple.cm", motDePasse: MOT_DE_PASSE, consentementTraitement: true, consentementRecruteurs: true });
    expect(rep.statusCode).toBe(409);
  });

  it("refuse l'inscription sans le consentement obligatoire, avec une explication", async () => {
    const rep = await inscription({ identifiant: "a@b.cm", motDePasse: MOT_DE_PASSE, consentementTraitement: false, consentementRecruteurs: true });
    expect(rep.statusCode).toBe(400);
    expect(rep.json().erreur.details.consentementTraitement).toContain("Sans ton accord");
    expect(await prisma.utilisateur.count()).toBe(0);
  });

  it("enregistre le refus du consentement recruteurs, modifiable ensuite", async () => {
    const cookie = await inscrire(app, "b@b.cm", false);
    expect((await prisma.dossier.findFirstOrThrow()).consentementRecruteursLe).toBeNull();
    const rep = await app.inject({ method: "PUT", url: "/candidat/consentements", payload: { recruteurs: true }, headers: { cookie } });
    expect(rep.json().consentementRecruteurs).toBe(true);
    expect((await prisma.dossier.findFirstOrThrow()).consentementRecruteursLe).toBeInstanceOf(Date);
    expect(await prisma.journal.count({ where: { action: "CONSENTEMENT_RECRUTEURS_DONNE" } })).toBeGreaterThan(0);
  });

  it("refuse un mot de passe trop court et un identifiant invalide", async () => {
    const court = await inscription({ identifiant: "a@b.cm", motDePasse: "court", consentementTraitement: true, consentementRecruteurs: true });
    expect(court.json().erreur.details.motDePasse).toContain("8 caractères");
    const invalide = await inscription({ identifiant: "12", motDePasse: MOT_DE_PASSE, consentementTraitement: true, consentementRecruteurs: true });
    expect(invalide.json().erreur.details.identifiant).toBeDefined();
  });
});

describe("Mot de passe oublié", () => {
  it("envoie un lien par e-mail, qui change le mot de passe et ferme les sessions", async () => {
    const cookie = await inscrire(app, "c@b.cm");
    const demande = await app.inject({ method: "POST", url: "/auth/mot-de-passe-oublie", payload: { identifiant: "c@b.cm" } });
    expect(demande.statusCode).toBe(200);
    const jeton = await jetonDuDernierEmail(prisma, "c@b.cm");

    const rep = await app.inject({ method: "POST", url: "/auth/reinitialiser", payload: { jeton, motDePasse: "nouveau-mot-de-passe" } });
    expect(rep.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).statusCode).toBe(401);
    await connecter(app, "c@b.cm", "nouveau-mot-de-passe");
    expect((await app.inject({ method: "POST", url: "/auth/reinitialiser", payload: { jeton, motDePasse: "encore-un-autre" } })).statusCode).toBe(400);
  });

  it("répond pareil pour une adresse inconnue, sans envoyer d'e-mail", async () => {
    const rep = await app.inject({ method: "POST", url: "/auth/mot-de-passe-oublie", payload: { identifiant: "personne@b.cm" } });
    expect(rep.statusCode).toBe(200);
    expect(rep.json().message).toContain("Si un compte existe");
    expect(await prisma.emailEnvoye.count()).toBe(0);
  });

  it("renvoie vers le cabinet (avec son téléphone) pour un compte sans e-mail", async () => {
    const admin = await creerCompte(prisma, "ADMIN");
    const cookieAdmin = await connecter(app, admin.email!);
    await app.inject({ method: "PUT", url: "/admin/reglages", payload: { telephoneCabinet: "+237 6 70 00 00 00", emailCabinet: null }, headers: { cookie: cookieAdmin } });
    const rep = await app.inject({ method: "POST", url: "/auth/mot-de-passe-oublie", payload: { identifiant: "699001122" } });
    expect(rep.json().message).toContain("contacte le cabinet");
    expect(rep.json().telephoneCabinet).toBe("+237 6 70 00 00 00");
    expect((await app.inject({ method: "GET", url: "/plateforme" })).json().telephoneCabinet).toBe("+237 6 70 00 00 00");
  });
});
