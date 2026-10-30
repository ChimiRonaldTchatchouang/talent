import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { detecterFormat } from "../src/routes/pieces.js";
import { corpsMultipart, demarrer, inscrire, JPEG, PDF, viderBase } from "./outils.js";

let app: App;
let prisma: PrismaClient;
let cookie: string;

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
  cookie = await inscrire(app, "awa@exemple.cm");
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

async function autoriser(type: string, pieceId?: string, c = cookie): Promise<string> {
  const r = await app.inject({ method: "POST", url: "/candidat/pieces/autorisation", payload: { type, pieceId }, headers: { cookie: c } });
  expect(r.statusCode).toBe(200);
  return r.json().chemin;
}
const deposer = (chemin: string, contenu: Buffer, nom = "photo.jpg") => app.inject({ method: "POST", url: chemin, ...corpsMultipart(contenu, nom) });

describe("Justificatifs (M4)", () => {
  it("reconnaît le vrai format du fichier", () => {
    expect(detecterFormat(JPEG)).toBe("image/jpeg");
    expect(detecterFormat(PDF)).toBe("application/pdf");
    expect(detecterFormat(Buffer.from("MZ exécutable"))).toBeNull();
  });

  it("dépose une pièce : elle passe « déposée (en attente) » et l'étape avance", async () => {
    const r = await deposer(await autoriser("IDENTITE"), JPEG);
    expect(r.statusCode).toBe(201);
    expect(r.json().piece.etat).toBe("DEPOSEE");
    const d = (await app.inject({ method: "GET", url: "/candidat/dossier", headers: { cookie } })).json();
    expect(d.etapes.find((e: { etape: string }) => e.etape === "JUSTIFICATIFS").etat).toBe("EN_COURS");
    expect(d.pieces.deposees[0]).toMatchObject({ type: "IDENTITE", etat: "DEPOSEE" });
  });

  it("refuse un format non accepté et un fichier trop lourd", async () => {
    const exe = await deposer(await autoriser("CV"), Buffer.from("MZ pas un document"), "virus.pdf");
    expect(exe.statusCode).toBe(400);
    expect(exe.json().erreur.message).toContain("JPG, PNG");
    const lourd = await deposer(await autoriser("CV"), Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024)]));
    expect(lourd.statusCode).toBe(413);
    expect(await prisma.piece.count()).toBe(0);
  });

  it("refuse un lien de dépôt falsifié", async () => {
    const chemin = await autoriser("CV");
    const r = await deposer(chemin.replace(/.$/, (c) => (c === "A" ? "B" : "A")), JPEG);
    expect(r.statusCode).toBe(401);
  });

  it("une pièce refusée peut être redéposée : elle repasse en attente et garde l'historique du refus", async () => {
    const id = (await deposer(await autoriser("IDENTITE"), JPEG)).json().piece.id;
    await prisma.piece.update({ where: { id }, data: { etat: "REFUSEE", motifRefus: "Photo floue" } });
    await prisma.pieceEvenement.create({ data: { pieceId: id, etat: "REFUSEE", motif: "Photo floue" } });

    const r = await deposer(await autoriser("IDENTITE"), PDF, "cni.pdf");
    expect(r.statusCode).toBe(201);
    expect(r.json().piece.id).toBe(id);
    const piece = await prisma.piece.findUniqueOrThrow({ where: { id }, include: { evenements: true, fichier: true } });
    expect(piece.etat).toBe("DEPOSEE");
    expect(piece.fichier.typeMime).toBe("application/pdf");
    expect(piece.evenements.map((e) => e.etat)).toEqual(["DEPOSEE", "REFUSEE", "DEPOSEE"]);
    expect(await prisma.fichier.count()).toBe(1);
  });

  it("une pièce vérifiée ne peut plus être remplacée ni retirée par le candidat", async () => {
    const id = (await deposer(await autoriser("CV"), PDF)).json().piece.id;
    await prisma.piece.update({ where: { id }, data: { etat: "VERIFIEE" } });
    const r = await app.inject({ method: "POST", url: "/candidat/pieces/autorisation", payload: { type: "CV" }, headers: { cookie } });
    expect(r.statusCode).toBe(409);
    expect((await app.inject({ method: "DELETE", url: `/candidat/pieces/${id}`, headers: { cookie } })).statusCode).toBe(409);
  });

  it("plusieurs certificats de travail possibles", async () => {
    await deposer(await autoriser("CERTIFICAT_TRAVAIL"), PDF);
    await deposer(await autoriser("CERTIFICAT_TRAVAIL"), PDF);
    expect(await prisma.piece.count({ where: { type: "CERTIFICAT_TRAVAIL" } })).toBe(2);
  });

  it("fichiers privés : lien temporaire pour le propriétaire seulement", async () => {
    const id = (await deposer(await autoriser("CV"), PDF)).json().piece.id;
    const lien = await app.inject({ method: "GET", url: `/candidat/pieces/${id}/lien`, headers: { cookie } });
    const fichier = await app.inject({ method: "GET", url: lien.json().chemin });
    expect(fichier.statusCode).toBe(200);
    expect(fichier.headers["content-type"]).toBe("application/pdf");
    expect(fichier.headers["cache-control"]).toBe("private, no-store");
    expect(fichier.body).toContain("%PDF-");

    // Lien modifié : refusé.
    expect((await app.inject({ method: "GET", url: `${lien.json().chemin}x` })).statusCode).toBe(403);
    // Sans lien : refusé.
    expect((await app.inject({ method: "GET", url: "/fichiers?jeton=0000000000" })).statusCode).toBe(403);
    // Un autre candidat ne peut pas obtenir de lien vers cette pièce.
    const autre = await inscrire(app, "autre@exemple.cm");
    expect((await app.inject({ method: "GET", url: `/candidat/pieces/${id}/lien`, headers: { cookie: autre } })).statusCode).toBe(404);
  });

  it("retire une pièce non vérifiée, avec son fichier", async () => {
    const id = (await deposer(await autoriser("CV"), PDF)).json().piece.id;
    expect((await app.inject({ method: "DELETE", url: `/candidat/pieces/${id}`, headers: { cookie } })).statusCode).toBe(204);
    expect(await prisma.fichier.count()).toBe(0);
  });
});
