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
  const a = await creerCompte(prisma, "ADMIN", { email: "michel@cabinet.cm" });
  admin = await connecter(app, a.email!);
});
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

const get = (url: string, cookie = admin) => app.inject({ method: "GET", url, headers: { cookie } });
const vivier = async (filtres = "") => (await get(`/admin/vivier?${filtres}`)).json();
const noms = (r: { candidats: { nomComplet: string }[] }) => r.candidats.map((c) => c.nomComplet).sort();

async function deposer(cookie: string, type: string) {
  const a = await app.inject({ method: "POST", url: "/candidat/pieces/autorisation", payload: { type }, headers: { cookie } });
  return (await app.inject({ method: "POST", url: a.json().chemin, ...corpsMultipart(JPEG) })).json().piece.id as string;
}

describe("Vivier et filtres (M7, W7)", () => {
  it("combine les filtres : grade, domaine, passeport valide, ville, langue, recherche", async () => {
    await candidatComplet(app, prisma, "a@b.cm", { prenoms: "Awa", aPasseport: true, passeportExpiration: "2030-01-01", langues: ["Français", "Anglais"] });
    await candidatComplet(app, prisma, "b@b.cm", { prenoms: "Boris", aPasseport: true, passeportExpiration: "2020-01-01" });
    await candidatComplet(app, prisma, "c@b.cm", { prenoms: "Carine", domaine: "Santé", ville: "Yaoundé" });
    await candidatComplet(app, prisma, "d@b.cm", { prenoms: "Didier", aDiplome: false });
    await candidatComplet(app, prisma, "e@b.cm", { prenoms: "Eric", envoyer: false });

    expect((await vivier()).total).toBe(4); // le brouillon n'apparaît pas (R-10)
    const btp = (await prisma.domaine.findUniqueOrThrow({ where: { nom: "BTP" } })).id;
    // « Tous les profils A et B en BTP avec passeport valide » (section 14)
    expect(noms(await vivier(`grades=A,B&domaineId=${btp}&passeportValide=true`))).toEqual(["Awa Ngono"]);
    expect(noms(await vivier("grades=D"))).toEqual(["Didier Ngono"]);
    expect(noms(await vivier("ville=yaou"))).toEqual(["Carine Ngono"]);
    expect(noms(await vivier("langue=Anglais"))).toEqual(["Awa Ngono"]);
    expect(noms(await vivier("q=bor"))).toEqual(["Boris Ngono"]);
    expect((await vivier("q=699001")).total).toBe(4);
    expect((await vivier("grades=A")).total).toBe(0);
  });

  it("filtre par compétences validées uniquement (W7) et par état des justificatifs", async () => {
    const { cookie } = await candidatComplet(app, prisma, "a@b.cm");
    await candidatComplet(app, prisma, "b@b.cm", { prenoms: "Boris" });
    const btp = await prisma.domaine.findUniqueOrThrow({ where: { nom: "BTP" } });
    const maconnerie = await prisma.competence.findFirstOrThrow({ where: { nom: "Maçonnerie" } });
    const proposee = await prisma.competence.create({ data: { nom: "Échafaudage", domaineId: btp.id, statut: "PROPOSEE" } });
    await app.inject({ method: "PUT", url: "/candidat/dossier/etapes/TRAVAIL", payload: { donnees: { competenceIds: [maconnerie.id, proposee.id] } }, headers: { cookie } });

    expect(noms(await vivier(`competenceIds=${maconnerie.id}`))).toEqual(["Awa Ngono"]);
    expect((await vivier(`competenceIds=${proposee.id}`)).total).toBe(0);

    await deposer(cookie, "CV");
    expect(noms(await vivier("justificatifs=A_VERIFIER"))).toEqual(["Awa Ngono"]);
    expect((await vivier("justificatifs=INCOMPLETS")).total).toBe(2);
  });

  it("aucun résultat : liste vide, sans erreur", async () => {
    const r = await vivier("ville=Introuvable");
    expect(r).toMatchObject({ total: 0, candidats: [] });
  });

  it("export CSV de la liste filtrée, lisible par Excel, journalisé", async () => {
    await candidatComplet(app, prisma, "a@b.cm", { prenoms: "=Awa" });
    const r = await get("/admin/vivier/export?grades=B");
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toContain("text/csv");
    expect(r.body.startsWith("﻿Nom;Grade;")).toBe(true);
    // Une valeur commençant par « = » est neutralisée (pas de formule exécutée par Excel).
    expect(r.body).toContain("'=Awa Ngono;B;Provisoire");
    expect(await prisma.journal.count({ where: { action: "VIVIER_EXPORTE", acteurId: { not: null } } })).toBeGreaterThan(0);
  });
});

describe("Tableau de bord", () => {
  it("compte les profils par grade, les brouillons, les pièces et grades à traiter", async () => {
    const { cookie } = await candidatComplet(app, prisma, "a@b.cm");
    await candidatComplet(app, prisma, "b@b.cm", { aDiplome: false });
    await candidatComplet(app, prisma, "c@b.cm", { envoyer: false });
    await deposer(cookie, "CV");
    const t = (await get("/admin/tableau-de-bord")).json();
    expect(t.grades).toMatchObject({ B: 1, D: 1, A: 0 });
    expect(t).toMatchObject({ brouillons: 1, piecesAVerifier: 1, gradesAConfirmer: 2 });
    expect(t.derniers).toHaveLength(2);
  });
});

describe("Fiche candidat", () => {
  it("renvoie tout le dossier, les notes et l'historique ; la consultation est journalisée", async () => {
    const { dossierId } = await candidatComplet(app, prisma, "a@b.cm");
    const note = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/notes`, payload: { texte: "Très motivée, à rappeler." }, headers: { cookie: admin } });
    expect(note.statusCode).toBe(201);
    const f = (await get(`/admin/dossiers/${dossierId}`)).json();
    expect(f.dossier.nom).toBe("Ngono");
    expect(f.compte.email).toBe("a@b.cm");
    expect(f.classement.grade).toBe("B");
    expect(f.notes[0]).toMatchObject({ texte: "Très motivée, à rappeler." });
    expect(f.historique.some((h: { action: string }) => h.action === "DOSSIER_ENVOYE")).toBe(true);
    expect(await prisma.journal.count({ where: { action: "DOSSIER_CONSULTE", cibleId: dossierId } })).toBe(1);
  });

  it("les notes internes ne sont jamais renvoyées au candidat", async () => {
    const { cookie, dossierId } = await candidatComplet(app, prisma, "a@b.cm");
    await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/notes`, payload: { texte: "Note secrète" }, headers: { cookie: admin } });
    const r = await get("/candidat/dossier", cookie);
    expect(r.body).not.toContain("Note secrète");
    expect((await get(`/admin/dossiers/${dossierId}`, cookie)).statusCode).toBe(403);
  });

  it("réinitialise le mot de passe d'un candidat sans e-mail", async () => {
    const { dossierId } = await candidatComplet(app, prisma, "a@b.cm");
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${dossierId}/mot-de-passe`, headers: { cookie: admin } });
    expect(r.json().motDePasse).toHaveLength(10);
    await connecter(app, "a@b.cm", r.json().motDePasse);
    expect(await prisma.journal.count({ where: { action: "MOT_DE_PASSE_REINITIALISE_PAR_ADMIN" } })).toBeGreaterThan(0);
  });
});

describe("Vérification des pièces (W5)", () => {
  it("affiche la file avec les informations déclarées, vérifie ou refuse (motif obligatoire)", async () => {
    const { cookie, dossierId } = await candidatComplet(app, prisma, "a@b.cm");
    const diplome = await deposer(cookie, "DIPLOME");
    const cv = await deposer(cookie, "CV");
    const file = (await get("/admin/pieces")).json();
    expect(file.pieces).toHaveLength(2);
    const p = file.pieces.find((x: { id: string }) => x.id === diplome);
    expect(p.declare).toContainEqual(["Diplôme", "BTS"]);

    const lien = (await get(`/admin/pieces/${diplome}/lien`)).json();
    expect((await app.inject({ method: "GET", url: lien.chemin })).statusCode).toBe(200);

    const sansMotif = await app.inject({ method: "POST", url: `/admin/pieces/${diplome}/decision`, payload: { decision: "REFUSEE", motif: "" }, headers: { cookie: admin } });
    expect(sansMotif.statusCode).toBe(400);
    const refus = await app.inject({ method: "POST", url: `/admin/pieces/${diplome}/decision`, payload: { decision: "REFUSEE", motif: "Document illisible ou flou" }, headers: { cookie: admin } });
    expect(refus.statusCode).toBe(200);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "a@b.cm", sujet: { contains: "redéposer" } } })).toBe(1);
    // Le diplôme refusé passe « en attente » (W5).
    const c = (await get(`/admin/dossiers/${dossierId}/classement`)).json();
    expect(c.elements.find((e: { element: string }) => e.element === "DIPLOME")).toMatchObject({ etat: "EN_ATTENTE", bloquant: true });

    expect((await app.inject({ method: "POST", url: `/admin/pieces/${cv}/decision`, payload: { decision: "VERIFIEE" }, headers: { cookie: admin } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: `/admin/pieces/${cv}/decision`, payload: { decision: "VERIFIEE" }, headers: { cookie: admin } })).statusCode).toBe(409);

    // Pièce redéposée : retour dans la file, avec l'historique des refus.
    await deposer(cookie, "DIPLOME");
    const apres = (await get("/admin/pieces")).json();
    expect(apres.pieces).toHaveLength(1);
    expect(apres.pieces[0].refusPrecedents[0].motif).toBe("Document illisible ou flou");
  });

  it("un recruteur ou un candidat n'accède pas à la file", async () => {
    const r = await creerCompte(prisma, "RECRUTEUR");
    const cookie = await connecter(app, r.email!);
    expect((await get("/admin/pieces", cookie)).statusCode).toBe(403);
    expect((await get("/admin/vivier", cookie)).statusCode).toBe(403);
    expect((await get("/admin/vivier/export", cookie)).statusCode).toBe(403);
  });
});

describe("Suivi des services", () => {
  it("liste les candidats intéressés", async () => {
    const { cookie } = await candidatComplet(app, prisma, "a@b.cm");
    const coaching = await prisma.service.findFirstOrThrow({ where: { nom: "Coaching" } });
    await app.inject({ method: "POST", url: `/candidat/services/${coaching.id}/interet`, headers: { cookie } });
    const r = (await get("/admin/services-demandes")).json();
    expect(r.demandes).toHaveLength(1);
    expect(r.demandes[0]).toMatchObject({ service: "Coaching", etat: "INTERESSE", grade: "B" });
  });
});
