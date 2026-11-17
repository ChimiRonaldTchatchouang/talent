import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { candidatComplet, connecter, creerCompte, demarrer, inscrire, viderBase } from "./outils.js";

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

const OFFRE = {
  titre: "Maçon coffreur",
  pays: "Canada",
  ville: "Québec",
  domaine: "BTP",
  typeContrat: "CDI",
  description: "Chantier à Québec. Salaire et démarche détaillés ici.",
  gradeRequis: "B",
  dateLimite: null as string | null,
  publiee: true,
};

async function publier(o: Partial<typeof OFFRE> = {}) {
  const r = await app.inject({ method: "POST", url: "/admin/offres", payload: { ...OFFRE, ...o }, headers: { cookie: admin } });
  expect(r.statusCode).toBe(201);
  return r.json() as { id: string; prevenus: number };
}

/** Candidat au grade B (par défaut), confirmé ou non par le cabinet. */
async function candidatB(email: string, confirmer = true) {
  const c = await candidatComplet(app, prisma, email);
  if (confirmer) {
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${c.dossierId}/grade/confirmer`, headers: { cookie: admin } });
    expect(r.json().grade).toBe("B");
  }
  return c;
}

describe("Publication des offres (cabinet)", () => {
  it("seul un administrateur publie ; la publication est journalisée et prévient les candidats éligibles", async () => {
    const b = await candidatB("b@b.cm");
    const refus = await app.inject({ method: "POST", url: "/admin/offres", payload: OFFRE, headers: { cookie: b.cookie } });
    expect(refus.statusCode).toBe(403);

    const offre = await publier();
    expect(offre.prevenus).toBe(1);
    expect(await prisma.journal.count({ where: { action: "OFFRE_CREEE", cibleId: offre.id } })).toBe(1);
    const notif = await prisma.notification.findFirstOrThrow({ where: { type: "NOUVELLE_OFFRE" } });
    expect(notif.lien).toBe(`/candidat/opportunites/${offre.id}`);

    // Grade A requis : le candidat B n'est pas prévenu.
    expect((await publier({ gradeRequis: "A" })).prevenus).toBe(0);
  });

  it("une offre non publiée ou expirée n'est pas montrée aux candidats", async () => {
    const b = await candidatB("b@b.cm");
    await publier({ publiee: false, titre: "Brouillon" });
    await publier({ dateLimite: "2020-01-01", titre: "Expirée" });
    await publier({ titre: "Ouverte" });
    const r = await app.inject({ method: "GET", url: "/candidat/offres", headers: { cookie: b.cookie } });
    expect(r.json().offres.map((o: { titre: string }) => o.titre)).toEqual(["Ouverte"]);
  });
});

describe("Opportunités côté candidat", () => {
  it("voit toutes les offres, mais n'ouvre que celles de son grade ou d'un grade inférieur", async () => {
    const b = await candidatB("b@b.cm");
    const offreB = await publier({ gradeRequis: "B", titre: "Offre B" });
    const offreC = await publier({ gradeRequis: "C", titre: "Offre C" });
    const offreA = await publier({ gradeRequis: "A", titre: "Offre A" });

    const liste = (await app.inject({ method: "GET", url: "/candidat/offres", headers: { cookie: b.cookie } })).json();
    const parTitre = Object.fromEntries(liste.offres.map((o: { titre: string }) => [o.titre, o]));
    expect(parTitre["Offre B"].accessible).toBe(true);
    expect(parTitre["Offre C"].accessible).toBe(true);
    expect(parTitre["Offre A"]).toMatchObject({ accessible: false, blocage: "GRADE_INSUFFISANT" });
    // La liste ne contient jamais la description.
    expect(JSON.stringify(liste)).not.toContain("Salaire et démarche");

    const ouverte = (await app.inject({ method: "GET", url: `/candidat/offres/${offreB.id}`, headers: { cookie: b.cookie } })).json();
    expect(ouverte.description).toContain("Salaire et démarche");
    expect((await app.inject({ method: "GET", url: `/candidat/offres/${offreC.id}`, headers: { cookie: b.cookie } })).json().accessible).toBe(true);

    // Offre A : refusée côté serveur, sans description, et le candidat reçoit une notification (une seule par jour).
    const verrouillee = (await app.inject({ method: "GET", url: `/candidat/offres/${offreA.id}`, headers: { cookie: b.cookie } })).json();
    expect(verrouillee).toMatchObject({ accessible: false, description: null, blocage: "GRADE_INSUFFISANT" });
    await app.inject({ method: "GET", url: `/candidat/offres/${offreA.id}`, headers: { cookie: b.cookie } });
    const notifs = await prisma.notification.findMany({ where: { type: "OFFRE_VERROUILLEE" } });
    expect(notifs).toHaveLength(1);
    expect(notifs[0]!.texte).toContain("Passe au grade A");

    const interet = await app.inject({ method: "POST", url: `/candidat/offres/${offreA.id}/interet`, headers: { cookie: b.cookie } });
    expect(interet.statusCode).toBe(403);
  });

  it("par défaut, un grade seulement provisoire n'ouvre pas les offres (paramètre modifiable)", async () => {
    const b = await candidatB("b@b.cm", false);
    const offre = await publier({ gradeRequis: "C" });
    const r = (await app.inject({ method: "GET", url: `/candidat/offres/${offre.id}`, headers: { cookie: b.cookie } })).json();
    expect(r).toMatchObject({ accessible: false, blocage: "GRADE_NON_CONFIRME" });

    const params = (await app.inject({ method: "GET", url: "/admin/parametres-classement", headers: { cookie: admin } })).json();
    const maj = await app.inject({
      method: "PUT",
      url: "/admin/parametres-classement",
      payload: { ...params.valeurs, opportunitesGradeConfirmeRequis: false },
      headers: { cookie: admin },
    });
    expect(maj.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: `/candidat/offres/${offre.id}`, headers: { cookie: b.cookie } })).json().accessible).toBe(true);
  });

  it("un dossier non envoyé n'ouvre aucune offre", async () => {
    const cookie = await inscrire(app, "brouillon@b.cm");
    const offre = await publier({ gradeRequis: "D" });
    const r = (await app.inject({ method: "GET", url: `/candidat/offres/${offre.id}`, headers: { cookie } })).json();
    expect(r).toMatchObject({ accessible: false, blocage: "DOSSIER_NON_ENVOYE" });
  });

  it("« Je suis intéressé(e) » : journalisé, cabinet prévenu, liste des intéressés", async () => {
    const b = await candidatB("b@b.cm");
    const offre = await publier();
    const r = await app.inject({ method: "POST", url: `/candidat/offres/${offre.id}/interet`, headers: { cookie: b.cookie } });
    expect(r.json().interesse).toBe(true);
    await app.inject({ method: "POST", url: `/candidat/offres/${offre.id}/interet`, headers: { cookie: b.cookie } });
    expect(await prisma.journal.count({ where: { action: "OFFRE_INTERESSE" } })).toBe(1);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm", sujet: { startsWith: "Intérêt pour une offre" } } })).toBe(1);
    const interesses = (await app.inject({ method: "GET", url: `/admin/offres/${offre.id}/interesses`, headers: { cookie: admin } })).json();
    expect(interesses).toHaveLength(1);
    expect(interesses[0]).toMatchObject({ nom: "Awa Ngono", grade: "B" });
  });
});

describe("Notifications du candidat", () => {
  it("bienvenue à l'inscription, puis dossier envoyé et grade confirmé ; marquer comme lues", async () => {
    const b = await candidatB("b@b.cm");
    const r = (await app.inject({ method: "GET", url: "/candidat/notifications", headers: { cookie: b.cookie } })).json();
    expect(r.notifications.map((n: { type: string }) => n.type)).toEqual(["GRADE_MIS_A_JOUR", "DOSSIER_ENVOYE", "BIENVENUE"]);
    expect(r.nonLues).toBe(3);
    await app.inject({ method: "POST", url: "/candidat/notifications/lues", headers: { cookie: b.cookie } });
    expect((await app.inject({ method: "GET", url: "/candidat/notifications", headers: { cookie: b.cookie } })).json().nonLues).toBe(0);
  });

  it("un candidat ne voit que ses propres notifications ; un admin n'a pas accès à cette route", async () => {
    const b = await candidatB("b@b.cm");
    await inscrire(app, "autre@b.cm");
    const r = (await app.inject({ method: "GET", url: "/candidat/notifications", headers: { cookie: b.cookie } })).json();
    expect(r.notifications).toHaveLength(3);
    expect((await app.inject({ method: "GET", url: "/candidat/notifications", headers: { cookie: admin } })).statusCode).toBe(403);
  });

  it("l'e-mail de bienvenue contient le lien d'installation de l'application", async () => {
    await inscrire(app, "nouveau@b.cm");
    const email = await prisma.emailEnvoye.findFirstOrThrow({ where: { destinataire: "nouveau@b.cm" } });
    expect(email.texte).toContain("/installer");
    expect(email.html).toContain("Installe l'application");
  });
});

describe("WhatsApp (cabinet)", () => {
  it("prépare le lien wa.me avec le numéro du candidat et le message, et l'inscrit au journal", async () => {
    const b = await candidatB("b@b.cm");
    const r = await app.inject({ method: "POST", url: `/admin/dossiers/${b.dossierId}/whatsapp`, payload: { message: "Bonjour Awa, rappel de ton rendez-vous" }, headers: { cookie: admin } });
    expect(r.statusCode).toBe(200);
    expect(r.json().lien).toBe("https://wa.me/237699001122?text=Bonjour%20Awa%2C%20rappel%20de%20ton%20rendez-vous");
    expect(await prisma.journal.count({ where: { action: "WHATSAPP_PREPARE", cibleId: b.dossierId } })).toBe(1);
    const refus = await app.inject({ method: "POST", url: `/admin/dossiers/${b.dossierId}/whatsapp`, payload: { message: "x" }, headers: { cookie: b.cookie } });
    expect(refus.statusCode).toBe(403);
  });
});
