import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { lireConfig } from "../src/lib/config.js";
import { alerterFinsAcces } from "../src/lib/recruteurs.js";
import { candidatComplet, connecter, creerCompte, demarrer, viderBase, type OptionsCandidat } from "./outils.js";

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

const dans = (jours: number) => new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);
const domaine = async (nom: string) => (await prisma.domaine.findUniqueOrThrow({ where: { nom } })).id;

/** Candidat au grade confirmé : A (coaching réalisé, pièces vérifiées) ou B. */
async function candidatConfirme(email: string, grade: "A" | "B", o: OptionsCandidat = {}, confirmer = true) {
  const c = await candidatComplet(app, prisma, email, { aPasseport: true, passeportExpiration: "2030-01-01", ...o });
  if (grade === "A") {
    const coaching = await prisma.service.findFirstOrThrow({ where: { nom: "Coaching" } });
    await app.inject({ method: "PUT", url: `/admin/dossiers/${c.dossierId}/services/${coaching.id}`, payload: { etat: "REALISE" }, headers: { cookie: admin } });
    for (const type of ["IDENTITE", "DIPLOME", "ATTESTATION_LANGUE"] as const) {
      const f = await prisma.fichier.create({ data: { contenu: new Uint8Array([1]), typeMime: "application/pdf", taille: 1, empreinte: type } });
      await prisma.piece.create({ data: { dossierId: c.dossierId, type, etat: "VERIFIEE", fichierId: f.id, nomFichier: "x.pdf" } });
    }
  }
  if (confirmer) {
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${c.dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect(r.json().grade).toBe(grade);
  }
  return c;
}

async function creerRecruteur(perimetre: { gradesVisibles: string[]; domainesVisibles?: string[] }, dateFin = dans(30), email = "rh@employeur.ca") {
  const r = await app.inject({
    method: "POST",
    url: "/admin/recruteurs",
    payload: { nom: "Julie Tremblay", entreprise: "Bâtir Québec", pays: "Canada", email, dateFin, domainesVisibles: [], ...perimetre },
    headers: { cookie: admin },
  });
  expect(r.statusCode).toBe(201);
  return { acces: r.json().recruteur, cookie: await connecter(app, email, r.json().motDePasse), motDePasse: r.json().motDePasse as string };
}

describe("Création d'un accès recruteur", () => {
  it("aperçu « Ce recruteur verra N profils », identifiants envoyés par e-mail, journalisé", async () => {
    await candidatConfirme("a@b.cm", "A");
    await candidatConfirme("b@b.cm", "B");
    const apercu = await app.inject({ method: "POST", url: "/admin/recruteurs/apercu", payload: { gradesVisibles: ["A", "B"] }, headers: { cookie: admin } });
    expect(apercu.json().nombre).toBe(2);

    const { acces, motDePasse } = await creerRecruteur({ gradesVisibles: ["A"] });
    expect(acces.profilsVisibles).toBe(1);
    const email = await prisma.emailEnvoye.findFirstOrThrow({ where: { destinataire: "rh@employeur.ca" } });
    expect(email.texte).toContain(motDePasse);
    expect(await prisma.journal.count({ where: { action: "ACCES_RECRUTEUR_CREE", cibleId: acces.id } })).toBe(1);
  });

  it("R-16 : date de fin obligatoire, et jamais dans le passé", async () => {
    const sans = await app.inject({ method: "POST", url: "/admin/recruteurs", payload: { nom: "X Y", entreprise: "E", pays: "Canada", email: "x@y.ca", gradesVisibles: ["A"] }, headers: { cookie: admin } });
    expect(sans.statusCode).toBe(400);
    const passee = await app.inject({ method: "POST", url: "/admin/recruteurs", payload: { nom: "X Y", entreprise: "Ent", pays: "Canada", email: "x@y.ca", gradesVisibles: ["A"], dateFin: "2020-01-01" }, headers: { cookie: admin } });
    expect(passee.statusCode).toBe(400);
  });
});

describe("Périmètre et anonymisation (R-14, R-15)", () => {
  it("T10 — recruteur « Grade A, BTP » : aucun B, aucun autre domaine, aucune coordonnée dans les réponses", async () => {
    const aBtp = await candidatConfirme("a@b.cm", "A", { prenoms: "Awa Marie", nom: "Ngono" });
    await candidatConfirme("b@b.cm", "B", { prenoms: "Boris" });
    await candidatConfirme("c@b.cm", "A", { prenoms: "Carine", domaine: "Santé" });
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"], domainesVisibles: [await domaine("BTP")] });

    const liste = await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } });
    expect(liste.json().total).toBe(1);
    const p = liste.json().profils[0];
    expect(p).toMatchObject({ nom: "Awa N.", grade: "A", domaine: "BTP" });
    expect(p.badges).toMatchObject({ diplomeVerifie: true, testVerifie: true, coache: true, passeportValide: true });

    const fiche = await app.inject({ method: "GET", url: `/recruteur/profils/${aBtp.dossierId}`, headers: { cookie } });
    for (const corps of [liste.body, fiche.body]) {
      expect(corps).not.toMatch(/699001122|\+237/); // téléphone
      expect(corps).not.toContain("a@b.cm"); // e-mail
      expect(corps).not.toContain("Ngono"); // nom de famille complet
      expect(corps).not.toContain("Douala"); // ville / adresse
      expect(corps).not.toContain("1995"); // date de naissance
      expect(corps).not.toMatch(/conjoint|enfants|fichier|pieces/i);
    }
  });

  it("seuls les grades confirmés et les candidats qui ont accepté d'être présentés sont visibles", async () => {
    await candidatConfirme("a@b.cm", "A", {}, false); // provisoire
    const refus = await candidatConfirme("b@b.cm", "A");
    await prisma.dossier.update({ where: { id: refus.dossierId }, data: { consentementRecruteursLe: null } });
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A", "B"] });
    expect((await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } })).json().total).toBe(0);
  });

  it("lien direct vers un profil hors périmètre : refusé et journalisé", async () => {
    const b = await candidatConfirme("b@b.cm", "B");
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] });
    const r = await app.inject({ method: "GET", url: `/recruteur/profils/${b.dossierId}`, headers: { cookie } });
    expect(r.statusCode).toBe(404);
    expect(await prisma.journal.count({ where: { action: "ACCES_HORS_PERIMETRE", cibleId: b.dossierId } })).toBe(1);
  });

  it("un recruteur ne peut rien modifier ni ouvrir l'espace admin ou candidat", async () => {
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] });
    for (const url of ["/admin/vivier", "/admin/pieces", "/candidat/dossier", "/admin/recruteurs"]) {
      expect((await app.inject({ method: "GET", url, headers: { cookie } })).statusCode).toBe(403);
    }
  });

  it("la consultation est visible par le candidat (nombre et date, sans le nom de l'entreprise)", async () => {
    const a = await candidatConfirme("a@b.cm", "A");
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] });
    await app.inject({ method: "GET", url: `/recruteur/profils/${a.dossierId}`, headers: { cookie } });
    const r = await app.inject({ method: "GET", url: "/candidat/consultations", headers: { cookie: a.cookie } });
    expect(r.json().nombre).toBe(1);
    expect(r.body).not.toContain("Bâtir");
  });
});

describe("Accès expiré (T11)", () => {
  it("connexion refusée après la date de fin, et session ouverte coupée", async () => {
    const { acces, cookie, motDePasse } = await creerRecruteur({ gradesVisibles: ["A"] });
    await prisma.accesRecruteur.update({ where: { id: acces.id }, data: { dateFin: new Date(dans(-1)) } });
    const r = await app.inject({ method: "POST", url: "/auth/connexion", payload: { identifiant: "rh@employeur.ca", motDePasse } });
    expect(r.statusCode).toBe(403);
    expect(r.json().erreur.message).toBe("Votre accès a expiré, contactez le cabinet.");
    expect((await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } })).statusCode).toBe(401);
  });

  it("l'accès reste ouvert le jour de la date de fin", async () => {
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] }, dans(0));
    expect((await app.inject({ method: "GET", url: "/recruteur/moi", headers: { cookie } })).statusCode).toBe(200);
  });

  it("alerte aux administrateurs 3 jours avant la fin, une seule fois", async () => {
    await creerRecruteur({ gradesVisibles: ["A"] }, dans(2));
    const config = lireConfig({ NODE_ENV: "test", DATABASE_URL: "x" });
    expect(await alerterFinsAcces(prisma, config)).toBe(1);
    expect(await alerterFinsAcces(prisma, config)).toBe(0);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { contains: "bientôt expiré" } } })).toBe(1);
  });
});

describe("Sélection (W8)", () => {
  it("ajouter, commenter, envoyer ; le cabinet la reçoit avec les vrais noms et suit chaque candidat", async () => {
    const a = await candidatConfirme("a@b.cm", "A", { prenoms: "Awa" });
    const b = await candidatConfirme("b@b.cm", "B", { prenoms: "Boris" });
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A", "B"] });
    const vide = await app.inject({ method: "POST", url: "/recruteur/selection/envoyer", headers: { cookie } });
    expect(vide.statusCode).toBe(400);

    await app.inject({ method: "PUT", url: `/recruteur/selection/profils/${a.dossierId}`, payload: { commentaire: "Profil idéal pour Montréal" }, headers: { cookie } });
    await app.inject({ method: "PUT", url: `/recruteur/selection/profils/${b.dossierId}`, payload: {}, headers: { cookie } });
    await app.inject({ method: "PUT", url: "/recruteur/selection", payload: { message: "Entretiens possibles en novembre." }, headers: { cookie } });
    const envoi = await app.inject({ method: "POST", url: "/recruteur/selection/envoyer", headers: { cookie } });
    expect(envoi.json()).toMatchObject({ envoye: true });
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { contains: "Sélection reçue" } } })).toBe(1);

    const recues = (await app.inject({ method: "GET", url: "/admin/selections", headers: { cookie: admin } })).json().selections;
    expect(recues).toHaveLength(1);
    expect(recues[0]).toMatchObject({ entreprise: "Bâtir Québec", message: "Entretiens possibles en novembre." });
    const ligneAwa = recues[0].lignes.find((l: { candidat: string }) => l.candidat === "Awa Ngono");
    expect(ligneAwa).toMatchObject({ commentaire: "Profil idéal pour Montréal", statut: "A_CONTACTER" });
    expect((await app.inject({ method: "GET", url: "/admin/tableau-de-bord", headers: { cookie: admin } })).json().selectionsRecues).toBe(1);

    const suivi = await app.inject({ method: "PUT", url: `/admin/selections/lignes/${ligneAwa.id}`, payload: { statut: "MIS_EN_RELATION" }, headers: { cookie: admin } });
    expect(suivi.statusCode).toBe(200);
  });

  it("sélection envoyée deux fois : la seconde remplace la première, l'historique et le suivi sont gardés", async () => {
    const a = await candidatConfirme("a@b.cm", "A");
    const b = await candidatConfirme("b@b.cm", "B");
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A", "B"] });
    await app.inject({ method: "PUT", url: `/recruteur/selection/profils/${a.dossierId}`, payload: {}, headers: { cookie } });
    await app.inject({ method: "POST", url: "/recruteur/selection/envoyer", headers: { cookie } });
    const premiere = (await app.inject({ method: "GET", url: "/admin/selections", headers: { cookie: admin } })).json().selections[0];
    await app.inject({ method: "PUT", url: `/admin/selections/lignes/${premiere.lignes[0].id}`, payload: { statut: "RETENU" }, headers: { cookie: admin } });

    await app.inject({ method: "PUT", url: `/recruteur/selection/profils/${b.dossierId}`, payload: {}, headers: { cookie } });
    await app.inject({ method: "POST", url: "/recruteur/selection/envoyer", headers: { cookie } });
    const actives = (await app.inject({ method: "GET", url: "/admin/selections", headers: { cookie: admin } })).json().selections;
    expect(actives).toHaveLength(1);
    expect(actives[0].lignes).toHaveLength(2);
    expect(actives[0].lignes.find((l: { dossierId: string }) => l.dossierId === a.dossierId).statut).toBe("RETENU");
    const historique = (await app.inject({ method: "GET", url: "/admin/selections?historique=true", headers: { cookie: admin } })).json().selections;
    expect(historique).toHaveLength(2);
    expect(historique[1].remplaceeLe).not.toBeNull();
  });

  it("un candidat sorti du périmètre (consentement retiré) disparaît de la sélection non envoyée, avec un message", async () => {
    const a = await candidatConfirme("a@b.cm", "A");
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] });
    await app.inject({ method: "PUT", url: `/recruteur/selection/profils/${a.dossierId}`, payload: {}, headers: { cookie } });
    await app.inject({ method: "PUT", url: "/candidat/consentements", payload: { recruteurs: false }, headers: { cookie: a.cookie } });
    const s = (await app.inject({ method: "GET", url: "/recruteur/selection", headers: { cookie } })).json();
    expect(s.lignes).toHaveLength(0);
    expect(s.retires).toContain("retiré");
    expect((await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } })).json().total).toBe(0);
  });

  it("grade baissé : le profil n'est plus visible", async () => {
    const a = await candidatConfirme("a@b.cm", "A");
    const { cookie } = await creerRecruteur({ gradesVisibles: ["A"] });
    await app.inject({ method: "POST", url: `/admin/dossiers/${a.dossierId}/grade/corriger`, payload: { grade: "C", raison: "Entretien insuffisant" }, headers: { cookie: admin } });
    expect((await app.inject({ method: "GET", url: "/recruteur/profils", headers: { cookie } })).json().total).toBe(0);
  });
});
