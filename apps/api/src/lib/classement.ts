import { type ElementComblable, type Grade, type TypePiece } from "@bdt/shared";
import type { Prisma, PrismaClient } from "@prisma/client";
import { classer, meilleurEtat, piecesNonVerifieesPourA, type EntreeClassement, type ResultatClassement } from "../classement/moteur.js";
import type { Config } from "./config.js";
import { envoyerAuxAdmins, envoyerEmail, modeles } from "./emails.js";
import { erreurs } from "./erreurs.js";
import { journaliser } from "./journal.js";
import { parametresEnVigueur } from "./parametres.js";
import { piecesRequises } from "./dossier.js";

const inclusion = {
  pieces: { select: { type: true, etat: true } },
  testLangue: { select: { scoreMinimum: true } },
  services: { include: { service: { select: { elementComble: true } } } },
  grade: true,
  utilisateur: { select: { email: true } },
} satisfies Prisma.DossierInclude;
type DossierClassement = Prisma.DossierGetPayload<{ include: typeof inclusion }>;

/** Traduit le dossier en entrée du moteur (les sections masquées par un « Non » sont ignorées). */
export function entreeDepuisDossier(d: DossierClassement): EntreeClassement {
  const requises = piecesRequises(d);
  const pieces: EntreeClassement["pieces"] = {};
  for (const type of new Set(d.pieces.map((p) => p.type))) {
    if (!requises.includes(type)) continue;
    const etat = meilleurEtat(d.pieces.filter((p) => p.type === type).map((p) => p.etat));
    if (etat) pieces[type as TypePiece] = etat;
  }
  return {
    aDiplome: d.aDiplome,
    aTravaille: d.aTravaille,
    trancheExperience: d.aTravaille ? d.trancheExperience : null,
    bureautique: d.aTravaille ? d.bureautique : null,
    aTestLangue: d.aTestLangue,
    testScore: d.aTestLangue && d.testScore !== null ? d.testScore.toNumber() : null,
    testScoreMinimum: d.testLangue?.scoreMinimum ? d.testLangue.scoreMinimum.toNumber() : null,
    pieces,
    servicesRealises: d.services
      .filter((s) => s.etat === "REALISE" && s.service.elementComble)
      .map((s) => s.service.elementComble as ElementComblable),
    niveauEvalue: d.niveauEvalue,
  };
}

/**
 * Origine du changement qui relance le calcul :
 * - CANDIDAT : le candidat a modifié son dossier ou ses pièces → un grade confirmé ou corrigé repasse
 *   en provisoire, avec une alerte aux administrateurs (W2, T14).
 * - ADMIN : service, évaluation ou vérification → un grade confirmé dont le calcul change repasse
 *   en provisoire (à reconfirmer) ; un grade corrigé reste figé.
 * - PARAMETRES : seuls les grades provisoires sont recalculés (T15).
 */
export type Origine = "CANDIDAT" | "ADMIN" | "PARAMETRES";

export async function recalculerGrade(
  db: PrismaClient,
  config: Config,
  dossierId: string,
  origine: Origine,
  cause: string,
  acteurId: string | null = null,
): Promise<ResultatClassement> {
  const dossier = await db.dossier.findUniqueOrThrow({ where: { id: dossierId }, include: inclusion });
  const parametres = (await parametresEnVigueur(db)).valeurs;
  const resultat = classer(entreeDepuisDossier(dossier), parametres);
  const calcul = {
    gradeCalcule: resultat.grade,
    regle: resultat.regle,
    explication: resultat.elements as unknown as Prisma.InputJsonValue,
    suggestions: resultat.suggestions,
    // Résumé pour les filtres du vivier (ex. « test de langue validé »).
    elementsFaits: resultat.elements.filter((x) => x.etat === "FAIT").map((x) => x.element),
    elementsAcquis: resultat.elements.filter((x) => x.acquis).map((x) => x.element),
    calculeLe: new Date(),
  };
  const actuel = dossier.grade;
  const historiser = (grade: Grade, etat: "PROVISOIRE" | "CONFIRME" | "CORRIGE", raison?: string) =>
    db.gradeHistorique.create({
      data: { dossierId, grade, gradeCalcule: resultat.grade, etat, cause, raison, auteurId: acteurId },
    });

  if (!actuel) {
    await db.gradeDossier.create({ data: { dossierId, ...calcul, grade: resultat.grade, etat: "PROVISOIRE" } });
    await historiser(resultat.grade, "PROVISOIRE");
    return resultat;
  }

  if (actuel.etat === "PROVISOIRE") {
    await db.gradeDossier.update({ where: { dossierId }, data: { ...calcul, grade: resultat.grade } });
    if (actuel.grade !== resultat.grade) await historiser(resultat.grade, "PROVISOIRE");
    return resultat;
  }

  // Grade confirmé ou corrigé.
  if (origine === "PARAMETRES") return resultat;
  const remettreEnProvisoire =
    origine === "CANDIDAT" || (actuel.etat === "CONFIRME" && actuel.gradeCalcule !== resultat.grade);
  if (!remettreEnProvisoire) {
    await db.gradeDossier.update({ where: { dossierId }, data: calcul });
    return resultat;
  }
  await db.gradeDossier.update({
    where: { dossierId },
    data: { ...calcul, grade: resultat.grade, etat: "PROVISOIRE", raison: null, auteurId: null, alerte: origine === "CANDIDAT" },
  });
  await historiser(resultat.grade, "PROVISOIRE");
  await journaliser(db, {
    acteurId,
    action: "GRADE_REMIS_EN_PROVISOIRE",
    cibleType: "dossier",
    cibleId: dossierId,
    details: { avant: actuel.grade, etatAvant: actuel.etat, apres: resultat.grade, cause },
  });
  if (origine === "CANDIDAT") {
    const nom = [dossier.prenoms, dossier.nom].filter(Boolean).join(" ") || "Un candidat";
    const site = config.URL_SITE.replace(/\/+$/, "");
    await envoyerAuxAdmins(
      db,
      config,
      modeles.gradeARevoir({
        nom,
        avant: actuel.grade,
        etatAvant: actuel.etat === "CONFIRME" ? "confirmé" : "corrigé",
        apres: resultat.grade,
        lien: `${site}/admin/candidats/${dossierId}`,
      }),
    );
  }
  return resultat;
}

/** Recalcule tous les grades provisoires (après un changement des paramètres, T15). */
export async function recalculerTousLesGrades(db: PrismaClient, config: Config, acteurId: string): Promise<number> {
  const dossiers = await db.dossier.findMany({
    where: { OR: [{ grade: null }, { grade: { etat: "PROVISOIRE" } }] },
    select: { id: true },
  });
  for (const d of dossiers) await recalculerGrade(db, config, d.id, "PARAMETRES", "Paramètres du classement modifiés", acteurId);
  return dossiers.length;
}

async function prevenirCandidat(db: PrismaClient, config: Config, dossierId: string, grade: Grade, corrige: boolean) {
  const d = await db.dossier.findUniqueOrThrow({ where: { id: dossierId }, include: { utilisateur: { select: { email: true } } } });
  const email = d.utilisateur.email ?? d.emailContact;
  if (!email) return;
  await envoyerEmail(db, config, email, modeles.gradeMisAJour({ grade, corrige, lien: `${config.URL_SITE.replace(/\/+$/, "")}/candidat/grade` }));
}

/** R-07, R-08 : confirmer le grade provisoire. Un A exige les pièces vérifiées (T9). */
export async function confirmerGrade(db: PrismaClient, config: Config, dossierId: string, acteurId: string) {
  const dossier = await db.dossier.findUnique({ where: { id: dossierId }, include: inclusion });
  if (!dossier) throw erreurs.introuvable("Ce dossier");
  if (dossier.statut !== "ENVOYE") throw erreurs.conflit("Ce dossier n'est pas encore envoyé : son grade ne peut pas être confirmé.");
  await recalculerGrade(db, config, dossierId, "ADMIN", "Avant confirmation", acteurId);
  const grade = await db.gradeDossier.findUniqueOrThrow({ where: { dossierId } });
  if (grade.etat !== "PROVISOIRE") throw erreurs.conflit("Ce grade est déjà confirmé ou corrigé.");
  if (grade.grade === "A") {
    const parametres = (await parametresEnVigueur(db)).valeurs;
    const manquantes = piecesNonVerifieesPourA(entreeDepuisDossier(dossier), parametres);
    if (manquantes.length > 0) {
      throw erreurs.conflit(
        "Un grade A ne peut être confirmé qu'avec les pièces vérifiées.",
        Object.fromEntries(manquantes.map((t) => [t, "Pièce à vérifier."])),
      );
    }
  }
  await db.gradeDossier.update({ where: { dossierId }, data: { etat: "CONFIRME", auteurId: acteurId, alerte: false, raison: null } });
  await db.gradeHistorique.create({ data: { dossierId, grade: grade.grade, gradeCalcule: grade.gradeCalcule, etat: "CONFIRME", cause: "Confirmation", auteurId: acteurId } });
  await journaliser(db, { acteurId, role: "ADMIN", action: "GRADE_CONFIRME", cibleType: "dossier", cibleId: dossierId, details: { grade: grade.grade } });
  await prevenirCandidat(db, config, dossierId, grade.grade, false);
}

/** R-09 : corriger le grade à la main, avec une raison obligatoire. Le grade reste figé. */
export async function corrigerGrade(db: PrismaClient, config: Config, dossierId: string, acteurId: string, nouveau: Grade, raison: string) {
  const dossier = await db.dossier.findUnique({ where: { id: dossierId } });
  if (!dossier) throw erreurs.introuvable("Ce dossier");
  if (dossier.statut !== "ENVOYE") throw erreurs.conflit("Ce dossier n'est pas encore envoyé : son grade ne peut pas être corrigé.");
  await recalculerGrade(db, config, dossierId, "ADMIN", "Avant correction", acteurId);
  const actuel = await db.gradeDossier.findUniqueOrThrow({ where: { dossierId } });
  await db.gradeDossier.update({ where: { dossierId }, data: { grade: nouveau, etat: "CORRIGE", raison, auteurId: acteurId, alerte: false } });
  await db.gradeHistorique.create({ data: { dossierId, grade: nouveau, gradeCalcule: actuel.gradeCalcule, etat: "CORRIGE", cause: "Correction", raison, auteurId: acteurId } });
  await journaliser(db, {
    acteurId,
    role: "ADMIN",
    action: "GRADE_CORRIGE",
    cibleType: "dossier",
    cibleId: dossierId,
    details: { avant: actuel.grade, apres: nouveau, calcule: actuel.gradeCalcule, raison },
  });
  await prevenirCandidat(db, config, dossierId, nouveau, true);
}

/** Libère un grade confirmé ou corrigé : il redevient le grade calculé, provisoire. */
export async function libererGrade(db: PrismaClient, config: Config, dossierId: string, acteurId: string) {
  const actuel = await db.gradeDossier.findUnique({ where: { dossierId } });
  if (!actuel) throw erreurs.introuvable("Ce grade");
  await db.gradeDossier.update({ where: { dossierId }, data: { etat: "PROVISOIRE", grade: actuel.gradeCalcule, raison: null, auteurId: null, alerte: false } });
  await db.gradeHistorique.create({ data: { dossierId, grade: actuel.gradeCalcule, gradeCalcule: actuel.gradeCalcule, etat: "PROVISOIRE", cause: "Libération", auteurId: acteurId } });
  await journaliser(db, { acteurId, role: "ADMIN", action: "GRADE_LIBERE", cibleType: "dossier", cibleId: dossierId });
  await recalculerGrade(db, config, dossierId, "ADMIN", "Libération", acteurId);
}
