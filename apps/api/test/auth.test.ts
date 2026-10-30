import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { connecter, creerCompte, demarrer, MOT_DE_PASSE, viderBase } from "./outils.js";

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

describe("Connexion", () => {
  it("connecte avec l'e-mail, quelle que soit la casse", async () => {
    await creerCompte(prisma, "ADMIN", { email: "michel@cabinet.cm" });
    const rep = await app.inject({
      method: "POST",
      url: "/auth/connexion",
      payload: { identifiant: "Michel@Cabinet.CM", motDePasse: MOT_DE_PASSE },
    });
    expect(rep.statusCode).toBe(200);
    expect(rep.json().utilisateur.role).toBe("ADMIN");
    const cookie = rep.cookies.find((c) => c.name === "bdt_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
  });

  it("connecte avec un téléphone saisi sans indicatif", async () => {
    await creerCompte(prisma, "CANDIDAT", { telephone: "+237699123456" });
    const cookie = await connecter(app, "699 12 34 56");
    const moi = await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } });
    expect(moi.json().utilisateur.telephone).toBe("+237699123456");
  });

  it("donne le même message pour un compte inconnu et un mauvais mot de passe", async () => {
    await creerCompte(prisma, "ADMIN", { email: "a@b.cm" });
    const inconnu = await app.inject({
      method: "POST",
      url: "/auth/connexion",
      payload: { identifiant: "personne@b.cm", motDePasse: "xxxxxxxx" },
    });
    const mauvais = await app.inject({
      method: "POST",
      url: "/auth/connexion",
      payload: { identifiant: "a@b.cm", motDePasse: "xxxxxxxx" },
    });
    expect(inconnu.statusCode).toBe(401);
    expect(mauvais.statusCode).toBe(401);
    expect(inconnu.json().erreur.message).toBe(mauvais.json().erreur.message);
    expect(mauvais.json().erreur.message).toBe("Identifiant ou mot de passe incorrect.");
  });

  it("bloque le compte après 5 échecs, même avec le bon mot de passe ensuite", async () => {
    const u = await creerCompte(prisma, "ADMIN", { email: "bloque@b.cm" });
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: "POST", url: "/auth/connexion", payload: { identifiant: "bloque@b.cm", motDePasse: "mauvais!" } });
    }
    const rep = await app.inject({
      method: "POST",
      url: "/auth/connexion",
      payload: { identifiant: "bloque@b.cm", motDePasse: MOT_DE_PASSE },
    });
    expect(rep.statusCode).toBe(429);
    expect(rep.json().erreur.code).toBe("TROP_DE_TENTATIVES");
    const journal = await prisma.journal.findFirst({ where: { cibleId: u.id, action: "COMPTE_BLOQUE_TEMPORAIREMENT" } });
    expect(journal).not.toBeNull();
  });

  it("refuse un compte désactivé", async () => {
    const u = await creerCompte(prisma, "ADMIN", { email: "off@b.cm" });
    await prisma.utilisateur.update({ where: { id: u.id }, data: { etat: "DESACTIVE" } });
    const rep = await app.inject({
      method: "POST",
      url: "/auth/connexion",
      payload: { identifiant: "off@b.cm", motDePasse: MOT_DE_PASSE },
    });
    expect(rep.statusCode).toBe(403);
    expect(rep.json().erreur.code).toBe("COMPTE_DESACTIVE");
  });

  it("renvoie les erreurs de validation en français, au format standard", async () => {
    const rep = await app.inject({ method: "POST", url: "/auth/connexion", payload: { identifiant: "" } });
    expect(rep.statusCode).toBe(400);
    expect(rep.json().erreur.code).toBe("DONNEES_INVALIDES");
    expect(rep.json().erreur.details.identifiant).toBe("Saisissez votre e-mail ou votre numéro de téléphone.");
  });

  it("déconnecte et invalide la session côté serveur", async () => {
    await creerCompte(prisma, "ADMIN", { email: "d@b.cm" });
    const cookie = await connecter(app, "d@b.cm");
    expect((await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).statusCode).toBe(200);
    await app.inject({ method: "POST", url: "/auth/deconnexion", headers: { cookie } });
    expect((await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).statusCode).toBe(401);
  });

  it("refuse un cookie inventé", async () => {
    const rep = await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie: "bdt_session=invente" } });
    expect(rep.statusCode).toBe(401);
  });

  it("ne stocke jamais le mot de passe en clair", async () => {
    const u = await creerCompte(prisma, "ADMIN");
    expect(u.motDePasseHash).not.toContain(MOT_DE_PASSE);
    expect(u.motDePasseHash.startsWith("$argon2id$")).toBe(true);
  });
});
