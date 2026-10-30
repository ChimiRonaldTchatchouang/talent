import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { candidatComplet, connecter, creerCompte, demarrer, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;
let admin: string;

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
  await creerCompte(prisma, "ADMIN", { email: "michel@cabinet.cm" });
  admin = await connecter(app, "michel@cabinet.cm");
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe("Données de démonstration", () => {
  it("crée ~20 candidats marqués « démo » de tous les grades, des comptes de test, et s'efface d'un clic", async () => {
    const vrai = await candidatComplet(app, prisma, "vrai@b.cm");
    const r = await app.inject({ method: "POST", url: "/admin/demo", headers: { cookie: admin } });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ candidats: 20, recruteurs: 1, actif: true });
    expect((await app.inject({ method: "POST", url: "/admin/demo", headers: { cookie: admin } })).statusCode).toBe(409);

    const vivier = (await app.inject({ method: "GET", url: "/admin/vivier?tout=true", headers: { cookie: admin } })).json();
    const demo = vivier.candidats.filter((c: { demo: boolean }) => c.demo);
    expect(demo.length).toBe(19); // un brouillon
    expect(demo.every((c: { nomComplet: string }) => c.nomComplet.includes("(démo)"))).toBe(true);
    expect(new Set(demo.map((c: { grade: string }) => c.grade))).toEqual(new Set(["A", "B", "C", "D", "HORS_BASSIN"]));

    // Les comptes de test fonctionnent ; le recruteur de démo ne voit que des profils de démo.
    await connecter(app, r.json().comptes.candidat.identifiant, r.json().comptes.candidat.motDePasse);
    const rec = await connecter(app, r.json().comptes.recruteur.identifiant, r.json().comptes.recruteur.motDePasse);
    const profils = (await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie: rec } })).json();
    expect(profils.total).toBeGreaterThan(0);
    expect(profils.profils.some((p: { id: string }) => p.id === vrai.dossierId)).toBe(false);
    // Aucun e-mail réel vers une adresse de démonstration.
    expect(await prisma.emailEnvoye.count({ where: { destinataire: { endsWith: "@demo.invalid" }, statut: { not: "DEMO" } } })).toBe(0);

    const efface = await app.inject({ method: "DELETE", url: "/admin/demo", headers: { cookie: admin } });
    expect(efface.json()).toMatchObject({ comptesEffaces: 21, actif: false });
    expect(await prisma.utilisateur.count({ where: { estDemo: true } })).toBe(0);
    expect(await prisma.fichier.count()).toBe(0);
    // Le vrai candidat est intact.
    expect(await prisma.dossier.count({ where: { id: vrai.dossierId } })).toBe(1);
  });

  it("un vrai recruteur ne voit jamais les profils de démonstration", async () => {
    await app.inject({ method: "POST", url: "/admin/demo", headers: { cookie: admin } });
    const r = await app.inject({
      method: "POST",
      url: "/admin/recruteurs",
      payload: { nom: "Vrai Recruteur", entreprise: "Vraie", pays: "Canada", email: "rh@vraie.ca", gradesVisibles: ["A", "B", "C", "D", "HORS_BASSIN"], dateFin: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10) },
      headers: { cookie: admin },
    });
    expect(r.json().recruteur.profilsVisibles).toBe(0);
    const cookie = await connecter(app, "rh@vraie.ca", r.json().motDePasse);
    expect((await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } })).json().total).toBe(0);
  });
});
