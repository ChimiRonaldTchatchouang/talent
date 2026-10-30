import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { candidatComplet, connecter, corpsMultipart, creerCompte, demarrer, JPEG, viderBase } from "./outils.js";

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

describe("Suppression d'un dossier (W10, M11)", () => {
  it("le candidat demande, le cabinet valide : dossier, fichiers et compte effacés, trace anonyme gardée", async () => {
    const { cookie, dossierId } = await candidatComplet(app, prisma, "awa@b.cm", { prenoms: "Awa", nom: "Ngono" });
    const a = await app.inject({ method: "POST", url: "/candidat/pieces/autorisation", payload: { type: "IDENTITE" }, headers: { cookie } });
    await app.inject({ method: "POST", url: a.json().chemin, ...corpsMultipart(JPEG) });
    expect(await prisma.fichier.count()).toBe(1);

    const sansCase = await app.inject({ method: "POST", url: "/candidat/suppression", payload: { confirmation: false }, headers: { cookie } });
    expect(sansCase.statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/candidat/suppression", payload: { confirmation: true }, headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/candidat/suppression", payload: { confirmation: true }, headers: { cookie } })).statusCode).toBe(409);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { contains: "suppression" } } })).toBe(1);

    const liste = (await app.inject({ method: "GET", url: "/admin/suppressions", headers: { cookie: admin } })).json();
    expect(liste.demandes).toHaveLength(1);
    expect(liste.demandes[0].candidat).toBe("Awa Ngono");
    expect((await app.inject({ method: "GET", url: "/admin/tableau-de-bord", headers: { cookie: admin } })).json().suppressionsEnAttente).toBe(1);

    const r = await app.inject({ method: "POST", url: `/admin/suppressions/${liste.demandes[0].id}/valider`, headers: { cookie: admin } });
    expect(r.statusCode).toBe(200);

    expect(await prisma.utilisateur.count({ where: { email: "awa@b.cm" } })).toBe(0);
    expect(await prisma.dossier.count({ where: { id: dossierId } })).toBe(0);
    expect(await prisma.fichier.count()).toBe(0);
    // Plus aucun e-mail ne garde son adresse ni son nom.
    expect(await prisma.emailEnvoye.count({ where: { OR: [{ destinataire: "awa@b.cm" }, { texte: { contains: "Awa Ngono" } }, { sujet: { contains: "Awa Ngono" } }] } })).toBe(0);
    // Trace anonyme de la demande.
    const trace = await prisma.demandeSuppression.findFirstOrThrow();
    expect(trace).toMatchObject({ statut: "TRAITEE", utilisateurId: null });
    expect(await prisma.journal.count({ where: { action: "SUPPRESSION_EFFECTUEE", cibleId: trace.id } })).toBe(1);
    // La session du candidat ne fonctionne plus.
    expect((await app.inject({ method: "GET", url: "/auth/moi", headers: { cookie } })).statusCode).toBe(401);
    // Une seconde validation est refusée.
    expect((await app.inject({ method: "POST", url: `/admin/suppressions/${trace.id}/valider`, headers: { cookie: admin } })).statusCode).toBe(409);
  });

  it("le candidat peut annuler sa demande tant qu'elle n'est pas traitée", async () => {
    const { cookie } = await candidatComplet(app, prisma, "awa@b.cm");
    await app.inject({ method: "POST", url: "/candidat/suppression", payload: { confirmation: true }, headers: { cookie } });
    await app.inject({ method: "DELETE", url: "/candidat/suppression", headers: { cookie } });
    expect((await app.inject({ method: "GET", url: "/candidat/suppression", headers: { cookie } })).json().demande).toBeNull();
    expect((await app.inject({ method: "GET", url: "/admin/suppressions", headers: { cookie: admin } })).json().demandes).toHaveLength(0);
  });

  it("seul un administrateur peut valider", async () => {
    const { cookie } = await candidatComplet(app, prisma, "awa@b.cm");
    await app.inject({ method: "POST", url: "/candidat/suppression", payload: { confirmation: true }, headers: { cookie } });
    const d = await prisma.demandeSuppression.findFirstOrThrow();
    expect((await app.inject({ method: "POST", url: `/admin/suppressions/${d.id}/valider`, headers: { cookie } })).statusCode).toBe(403);
  });
});
