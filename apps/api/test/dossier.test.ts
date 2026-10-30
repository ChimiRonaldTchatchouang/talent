import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import { connecter, creerCompte, demarrer, inscrire, MOT_DE_PASSE, viderBase } from "./outils.js";

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

const enregistrer = (etape: string, donnees: object, terminer = false, c = cookie) =>
  app.inject({ method: "PUT", url: `/candidat/dossier/etapes/${etape}`, payload: { donnees, terminer }, headers: { cookie: c } });
const dossier = async (c = cookie) => (await app.inject({ method: "GET", url: "/candidat/dossier", headers: { cookie: c } })).json();
const etat = (d: { etapes: { etape: string; etat: string }[] }, etape: string) => d.etapes.find((e) => e.etape === etape)?.etat;

const PERSONNEL = {
  nom: "Ngono",
  prenoms: "Awa Marie",
  dateNaissance: "1995-04-12",
  sexe: "FEMME",
  nationalite: "Camerounaise",
  ville: "Douala",
  telephoneContact: "+237699001122",
  languesParlees: ["Français", "Anglais"],
  aPasseport: true,
  passeportExpiration: "2029-01-31",
};
const FAMILLE = { situation: "CELIBATAIRE", enfants: "AUCUN", partAvecAccompagnants: false };

async function referentiels() {
  return (await app.inject({ method: "GET", url: "/referentiels" })).json();
}

describe("Étapes du dossier (W2)", () => {
  it("enregistre automatiquement une étape incomplète (en cours), puis la termine", async () => {
    const partiel = await enregistrer("PERSONNEL", { nom: "Ngono", prenoms: "Awa" });
    expect(partiel.statusCode).toBe(200);
    expect(etat(partiel.json(), "PERSONNEL")).toBe("EN_COURS");

    const incomplet = await enregistrer("PERSONNEL", { ville: "Douala" }, true);
    expect(incomplet.statusCode).toBe(400);
    expect(incomplet.json().erreur.details).toHaveProperty("dateNaissance", "Ce champ est obligatoire.");
    // Les réponses sont gardées même si l'étape n'est pas complète.
    expect((await dossier()).dossier.ville).toBe("Douala");

    const complet = await enregistrer("PERSONNEL", PERSONNEL, true);
    expect(complet.statusCode).toBe(200);
    expect(etat(complet.json(), "PERSONNEL")).toBe("TERMINE");
    expect(complet.json().dossier.dateNaissance).toBe("1995-04-12");
  });

  it("exige la date d'expiration seulement si le candidat a un passeport", async () => {
    const r = await enregistrer("PERSONNEL", { ...PERSONNEL, passeportExpiration: null }, true);
    expect(r.json().erreur.details).toHaveProperty("passeportExpiration");
    const sans = await enregistrer("PERSONNEL", { ...PERSONNEL, aPasseport: false, passeportExpiration: null }, true);
    expect(sans.statusCode).toBe(200);
  });

  it("question filtre diplôme : Non = étape sautée, données gardées et réaffichées si Oui", async () => {
    const { diplomes } = await referentiels();
    const avecDiplome = {
      aDiplome: true,
      diplomeId: diplomes[2].id,
      diplomeIntitule: "BTS Génie civil",
      etablissement: "IUT de Douala",
      diplomeAnnee: 2018,
      diplomePays: "Cameroun",
    };
    expect(etat((await enregistrer("DIPLOME", avecDiplome, true)).json(), "DIPLOME")).toBe("TERMINE");

    const non = (await enregistrer("DIPLOME", { aDiplome: false }, true)).json();
    expect(etat(non, "DIPLOME")).toBe("SAUTE");
    expect(non.dossier.diplomeIntitule).toBe("BTS Génie civil");
    expect(non.pieces.requises.map((p: { type: string }) => p.type)).not.toContain("DIPLOME");

    const oui = (await enregistrer("DIPLOME", { aDiplome: true }, true)).json();
    expect(etat(oui, "DIPLOME")).toBe("TERMINE");
    expect(oui.pieces.requises.map((p: { type: string }) => p.type)).toContain("DIPLOME");
  });

  it("T12 — reprend à la dernière étape remplie, même après une nouvelle connexion", async () => {
    await enregistrer("PERSONNEL", PERSONNEL, true);
    await enregistrer("LANGUES", { aTestLangue: true });
    const nouveauCookie = await connecter(app, "awa@exemple.cm", MOT_DE_PASSE);
    const d = await dossier(nouveauCookie);
    expect(d.etapeReprise).toBe("LANGUES");
    expect(etat(d, "LANGUES")).toBe("EN_COURS");
    expect(d.progression).toBeGreaterThan(0);
  });

  it("refuse un choix absent des listes de référence", async () => {
    const r = await enregistrer("DIPLOME", { aDiplome: true, diplomeId: "00000000-0000-4000-8000-000000000000" });
    expect(r.statusCode).toBe(400);
    expect(r.json().erreur.details).toHaveProperty("diplomeId");
  });

  it("expérience : plusieurs lignes, compétences validées ou proposées par le candidat lui-même", async () => {
    const { domaines, competences } = await referentiels();
    const btp = domaines.find((d: { nom: string }) => d.nom === "BTP");
    const maconnerie = competences.find((c: { nom: string }) => c.nom === "Maçonnerie");
    const proposee = await app.inject({
      method: "POST",
      url: "/candidat/competences",
      payload: { domaineId: btp.id, nom: "Échafaudage" },
      headers: { cookie },
    });
    expect(proposee.statusCode).toBe(201);
    expect(proposee.json().competence.statut).toBe("PROPOSEE");

    const travail = {
      aTravaille: true,
      domaineId: btp.id,
      metier: "Maçon",
      trancheExperience: "ANS_10_PLUS",
      bureautique: "MOYEN",
      experiences: [
        { employeur: "Sogea", poste: "Maçon", debut: "2012-01", fin: "2018-06", ville: "Douala" },
        { employeur: "Razel", poste: "Chef d'équipe", debut: "2018-07", fin: null, ville: "Yaoundé" },
      ],
      competenceIds: [maconnerie.id, proposee.json().competence.id],
    };
    const r = (await enregistrer("TRAVAIL", travail, true)).json();
    expect(etat(r, "TRAVAIL")).toBe("TERMINE");
    expect(r.dossier.experiences).toHaveLength(2);
    expect(r.dossier.competences.map((c: { nom: string }) => c.nom).sort()).toEqual(["Maçonnerie", "Échafaudage"].sort());

    // La compétence proposée par un autre candidat n'est pas utilisable.
    const autre = await inscrire(app, "autre@exemple.cm");
    const refus = await enregistrer("TRAVAIL", { competenceIds: [proposee.json().competence.id] }, false, autre);
    expect(refus.statusCode).toBe(400);
  });

  it("ni diplôme ni expérience : le dossier peut être envoyé, même sans pièce", async () => {
    await enregistrer("PERSONNEL", PERSONNEL, true);
    await enregistrer("DIPLOME", { aDiplome: false }, true);
    await enregistrer("LANGUES", { aTestLangue: false }, true);
    await enregistrer("TRAVAIL", { aTravaille: false }, true);
    await enregistrer("FAMILLE", FAMILLE, true);
    const avant = await dossier();
    expect(avant.pretAEnvoyer).toBe(true);
    expect(etat(avant, "TRAVAIL")).toBe("SAUTE");
    expect(etat(avant, "JUSTIFICATIFS")).toBe("A_FAIRE");

    const sansCase = await app.inject({ method: "POST", url: "/candidat/dossier/envoyer", payload: { certifie: false }, headers: { cookie } });
    expect(sansCase.statusCode).toBe(400);

    await creerCompte(prisma, "ADMIN", { email: "michel@cabinet.cm" });
    const envoi = await app.inject({ method: "POST", url: "/candidat/dossier/envoyer", payload: { certifie: true }, headers: { cookie } });
    expect(envoi.statusCode).toBe(200);
    expect(envoi.json().dossier.statut).toBe("ENVOYE");
    expect(envoi.json().pieces.requises.filter((p: { manquante: boolean }) => p.manquante)).toHaveLength(2);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "awa@exemple.cm", sujet: { contains: "bien envoyé" } } })).toBe(1);
    expect(await prisma.emailEnvoye.count({ where: { destinataire: "michel@cabinet.cm" } })).toBe(1);

    // Modification après envoi : autorisée et journalisée.
    expect((await enregistrer("FAMILLE", { enfants: "UN" })).statusCode).toBe(200);
    expect(await prisma.journal.count({ where: { action: "DOSSIER_MODIFIE_APRES_ENVOI" } })).toBe(1);
  });

  it("refuse l'envoi tant qu'une étape n'est pas terminée", async () => {
    await enregistrer("PERSONNEL", PERSONNEL, true);
    const r = await app.inject({ method: "POST", url: "/candidat/dossier/envoyer", payload: { certifie: true }, headers: { cookie } });
    expect(r.statusCode).toBe(400);
    expect(Object.keys(r.json().erreur.details)).toEqual(["DIPLOME", "LANGUES", "TRAVAIL", "FAMILLE"]);
  });

  it("conjoint demandé seulement si marié(e) ou en union libre", async () => {
    const r = await enregistrer("FAMILLE", { ...FAMILLE, situation: "MARIE" }, true);
    expect(Object.keys(r.json().erreur.details).sort()).toEqual(["conjointNom", "conjointPasseport", "conjointProfession"]);
  });

  it("un administrateur ne peut pas utiliser l'espace candidat, ni un candidat l'espace admin", async () => {
    const admin = await creerCompte(prisma, "ADMIN");
    const cookieAdmin = await connecter(app, admin.email!);
    expect((await app.inject({ method: "GET", url: "/candidat/dossier", headers: { cookie: cookieAdmin } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/admin/emails", headers: { cookie } })).statusCode).toBe(403);
  });
});
