import type { PrismaClient } from "@prisma/client";
import { DIPLOMES, DOMAINES_ET_COMPETENCES, SERVICES, TESTS_LANGUE } from "./donnees-depart.js";
import { journaliser } from "./journal.js";
import { hacherMotDePasse } from "./mots-de-passe.js";

/** Charge les listes de référence de départ. Ne touche à rien si une liste contient déjà des éléments. */
export async function chargerDonneesDepart(db: PrismaClient): Promise<string[]> {
  const faits: string[] = [];
  if ((await db.domaine.count()) === 0) {
    for (const [nom, competences] of Object.entries(DOMAINES_ET_COMPETENCES)) {
      await db.domaine.create({
        data: { nom, competences: { create: competences.map((c) => ({ nom: c, statut: "VALIDEE" as const })) } },
      });
    }
    faits.push("domaines et compétences");
  }
  if ((await db.testLangue.count()) === 0) {
    await db.testLangue.createMany({ data: TESTS_LANGUE });
    faits.push("tests de langue");
  }
  if ((await db.service.count()) === 0) {
    await db.service.createMany({ data: SERVICES });
    faits.push("services");
  }
  if ((await db.diplome.count()) === 0) {
    await db.diplome.createMany({ data: DIPLOMES.map((nom, i) => ({ nom, ordre: (i + 1) * 10 })) });
    faits.push("diplômes");
  }
  return faits;
}

export interface ComptePrincipal {
  email?: string;
  motDePasse?: string;
  nom?: string;
}

/**
 * Crée le compte administrateur principal s'il n'existe pas encore.
 * Les identifiants viennent des variables d'environnement, jamais du code.
 */
export async function creerAdminPrincipal(
  db: PrismaClient,
  compte: ComptePrincipal,
): Promise<"existe" | "cree" | "manquant"> {
  if (await db.utilisateur.findFirst({ where: { role: "ADMIN", estPrincipal: true } })) return "existe";
  if (!compte.email || !compte.motDePasse) return "manquant";
  if (compte.motDePasse.length < 12) {
    throw new Error("Le mot de passe de l'administrateur principal doit contenir au moins 12 caractères.");
  }
  const admin = await db.utilisateur.create({
    data: {
      role: "ADMIN",
      estPrincipal: true,
      nom: compte.nom ?? "Administrateur principal",
      email: compte.email.trim().toLowerCase(),
      motDePasseHash: await hacherMotDePasse(compte.motDePasse),
    },
  });
  await journaliser(db, { acteurId: null, action: "ADMINISTRATEUR_PRINCIPAL_CREE", cibleType: "utilisateur", cibleId: admin.id });
  return "cree";
}
