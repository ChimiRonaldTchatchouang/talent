import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { connecter, creerCompte, demarrer, viderBase } from "./outils.js";

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

const ROUTES_ADMIN: { method: "GET" | "POST" | "PUT" | "PATCH"; url: string }[] = [
  { method: "GET", url: "/admin/referentiels/domaines" },
  { method: "POST", url: "/admin/referentiels/domaines" },
  { method: "GET", url: "/admin/parametres-classement" },
  { method: "PUT", url: "/admin/parametres-classement" },
  { method: "GET", url: "/admin/administrateurs" },
  { method: "POST", url: "/admin/administrateurs" },
  { method: "GET", url: "/admin/journal" },
];

describe("Droits vérifiés côté serveur", () => {
  it.each(ROUTES_ADMIN)("$method $url : refusé sans connexion (401)", async ({ method, url }) => {
    const rep = await app.inject({ method, url, payload: {} });
    expect(rep.statusCode).toBe(401);
    expect(rep.json().erreur.code).toBe("NON_CONNECTE");
  });

  it.each(["CANDIDAT", "RECRUTEUR"] as const)("refuse toutes les routes admin à un %s (403)", async (role) => {
    const u = await creerCompte(prisma, role);
    const cookie = await connecter(app, u.email!);
    for (const { method, url } of ROUTES_ADMIN) {
      const rep = await app.inject({ method, url, payload: { nom: "Pirate" }, headers: { cookie } });
      expect(rep.statusCode, `${method} ${url}`).toBe(403);
    }
    expect(await prisma.domaine.count({ where: { nom: "Pirate" } })).toBe(0);
  });

  it("autorise un administrateur", async () => {
    const u = await creerCompte(prisma, "ADMIN");
    const cookie = await connecter(app, u.email!);
    const rep = await app.inject({ method: "GET", url: "/admin/referentiels/domaines", headers: { cookie } });
    expect(rep.statusCode).toBe(200);
  });

  it("répond en français à une adresse inconnue", async () => {
    const rep = await app.inject({ method: "GET", url: "/nexiste-pas" });
    expect(rep.statusCode).toBe(404);
    expect(rep.json().erreur.message).toBe("Cette adresse n'existe pas.");
  });
});

describe("Administrateurs", () => {
  it("seul l'administrateur principal crée un administrateur, et c'est journalisé", async () => {
    const principal = await creerCompte(prisma, "ADMIN", { estPrincipal: true });
    const simple = await creerCompte(prisma, "ADMIN");
    const corps = { nom: "Awa Ngono", email: "awa@cabinet.cm", motDePasse: "un-mot-de-passe" };

    const refuse = await app.inject({
      method: "POST",
      url: "/admin/administrateurs",
      payload: corps,
      headers: { cookie: await connecter(app, simple.email!) },
    });
    expect(refuse.statusCode).toBe(403);

    const cookie = await connecter(app, principal.email!);
    const cree = await app.inject({ method: "POST", url: "/admin/administrateurs", payload: corps, headers: { cookie } });
    expect(cree.statusCode).toBe(201);
    expect(cree.json().administrateur).not.toHaveProperty("motDePasseHash");
    expect(await prisma.journal.count({ where: { action: "ADMINISTRATEUR_CREE", cibleId: cree.json().administrateur.id } })).toBe(1);

    const doublon = await app.inject({ method: "POST", url: "/admin/administrateurs", payload: corps, headers: { cookie } });
    expect(doublon.statusCode).toBe(409);
    expect(doublon.json().erreur.message).toBe("Cette adresse e-mail a déjà un compte.");
  });

  it("désactiver un administrateur coupe ses sessions ; le principal ne peut pas être désactivé", async () => {
    const principal = await creerCompte(prisma, "ADMIN", { estPrincipal: true });
    const autre = await creerCompte(prisma, "ADMIN");
    const cookieAutre = await connecter(app, autre.email!);
    const cookie = await connecter(app, principal.email!);

    const rep = await app.inject({
      method: "PATCH",
      url: `/admin/administrateurs/${autre.id}`,
      payload: { etat: "DESACTIVE" },
      headers: { cookie },
    });
    expect(rep.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie: cookieAutre } })).statusCode).toBe(401);

    const lui = await app.inject({
      method: "PATCH",
      url: `/admin/administrateurs/${principal.id}`,
      payload: { etat: "DESACTIVE" },
      headers: { cookie },
    });
    expect(lui.statusCode).toBe(409);
  });
});

describe("Journal des actions", () => {
  it("ne peut être ni modifié ni supprimé, même directement en base", async () => {
    const u = await creerCompte(prisma, "ADMIN");
    await connecter(app, u.email!);
    const entree = await prisma.journal.findFirstOrThrow({ where: { acteurId: u.id } });
    await expect(prisma.journal.update({ where: { id: entree.id }, data: { action: "AUTRE" } })).rejects.toThrow();
    await expect(prisma.journal.delete({ where: { id: entree.id } })).rejects.toThrow();
    await expect(prisma.$executeRawUnsafe("TRUNCATE journal")).rejects.toThrow();
    expect(await prisma.journal.findUnique({ where: { id: entree.id } })).not.toBeNull();
  });

  it("est consultable par un administrateur", async () => {
    const u = await creerCompte(prisma, "ADMIN");
    const cookie = await connecter(app, u.email!);
    const rep = await app.inject({ method: "GET", url: "/admin/journal", headers: { cookie } });
    expect(rep.statusCode).toBe(200);
    expect(rep.json().entrees[0].action).toBe("CONNEXION");
  });
});
