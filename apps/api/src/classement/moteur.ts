/**
 * Moteur de classement (section 6 de la spécification).
 * Fonctions pures : mêmes entrées, même résultat. Aucun accès à la base, aucune IA.
 * Tous les seuils viennent des paramètres du classement.
 */
import {
  ANNEES_MIN_TRANCHE,
  NIVEAUX_BUREAUTIQUE,
  type ElementComblable,
  type ElementGrade,
  type EtatElement,
  type Grade,
  type NiveauBureautique,
  type NiveauEvalue,
  type ParametresClassement,
  type TrancheExperience,
  type TypePiece,
} from "@bdt/shared";

export type EtatPieceClassement = "DEPOSEE" | "VERIFIEE" | "REFUSEE";

export interface EntreeClassement {
  aDiplome: boolean | null;
  aTravaille: boolean | null;
  trancheExperience: TrancheExperience | null;
  bureautique: NiveauBureautique | null;
  aTestLangue: boolean | null;
  testScore: number | null;
  /** Score minimum du test déclaré ; null = pas de comparaison automatique (« Autre »). */
  testScoreMinimum: number | null;
  /** Meilleur état de chaque type de pièce (vérifiée > déposée > refusée). Absent = pas de pièce. */
  pieces: Partial<Record<TypePiece, EtatPieceClassement>>;
  /** Éléments dont un service du cabinet est « Réalisé ». */
  servicesRealises: ElementComblable[];
  niveauEvalue: NiveauEvalue;
}

export interface ElementExplique {
  element: ElementGrade;
  etat: EtatElement;
  /** Compte pour le grade provisoire. */
  acquis: boolean;
  /** Une pièce a été refusée : le grade A est impossible tant qu'elle n'est pas redéposée. */
  bloquant: boolean;
  raison: string;
}

export interface ResultatClassement {
  grade: Grade;
  regle: string;
  elements: ElementExplique[];
  /** Éléments pour lesquels un service du cabinet est suggéré (R-12, R-13). */
  suggestions: ElementComblable[];
}

const rangBureautique = (n: NiveauBureautique) => NIVEAUX_BUREAUTIQUE.indexOf(n);

function elementDiplome(e: EntreeClassement): ElementExplique {
  const base = { element: "DIPLOME" as const, bloquant: false };
  if (!e.aDiplome) return { ...base, etat: "MANQUANT", acquis: false, raison: "Aucun diplôme déclaré." };
  if (e.pieces.DIPLOME === "VERIFIEE") return { ...base, etat: "FAIT", acquis: true, raison: "Diplôme déclaré et vérifié par le cabinet." };
  if (e.pieces.DIPLOME === "REFUSEE") {
    return { ...base, etat: "EN_ATTENTE", acquis: true, bloquant: true, raison: "La pièce « diplôme » a été refusée : elle doit être redéposée." };
  }
  return {
    ...base,
    etat: "EN_ATTENTE",
    acquis: true,
    raison: e.pieces.DIPLOME === "DEPOSEE" ? "Diplôme déclaré ; pièce en cours de vérification." : "Diplôme déclaré ; pièce pas encore déposée.",
  };
}

function elementTest(e: EntreeClassement): ElementExplique {
  const base = { element: "TEST_LANGUE" as const, bloquant: false };
  if (e.servicesRealises.includes("TEST_LANGUE")) {
    return { ...base, etat: "FAIT", acquis: true, raison: "Formation aux tests de langue réalisée avec le cabinet." };
  }
  if (!e.aTestLangue) return { ...base, etat: "MANQUANT", acquis: false, raison: "Aucun test de langue déclaré." };
  if (e.testScoreMinimum === null) {
    // Test sans score minimum (« Autre ») : seul le cabinet peut juger, en vérifiant l'attestation.
    if (e.pieces.ATTESTATION_LANGUE === "VERIFIEE") return { ...base, etat: "FAIT", acquis: true, raison: "Test de langue vérifié par le cabinet." };
    return { ...base, etat: "EN_ATTENTE", acquis: false, raison: "Test sans score de référence : le cabinet doit vérifier l'attestation." };
  }
  if (e.testScore === null || e.testScore < e.testScoreMinimum) {
    return { ...base, etat: "MANQUANT", acquis: false, raison: `Score inférieur au minimum demandé (${e.testScoreMinimum}).` };
  }
  if (e.pieces.ATTESTATION_LANGUE === "VERIFIEE") return { ...base, etat: "FAIT", acquis: true, raison: "Score suffisant ; attestation vérifiée." };
  if (e.pieces.ATTESTATION_LANGUE === "REFUSEE") {
    return { ...base, etat: "EN_ATTENTE", acquis: true, bloquant: true, raison: "L'attestation a été refusée : elle doit être redéposée." };
  }
  return { ...base, etat: "EN_ATTENTE", acquis: true, raison: "Score suffisant ; attestation pas encore vérifiée." };
}

function elementCoaching(e: EntreeClassement): ElementExplique {
  // Seul l'administrateur peut marquer le coaching comme réalisé (T8).
  if (e.servicesRealises.includes("COACHING")) {
    return { element: "COACHING", etat: "FAIT", acquis: true, bloquant: false, raison: "Coaching réalisé avec le cabinet." };
  }
  return { element: "COACHING", etat: "MANQUANT", acquis: false, bloquant: false, raison: "Coaching pas encore réalisé avec le cabinet." };
}

function elementNiveau(e: EntreeClassement, p: ParametresClassement): ElementExplique {
  const base = { element: "NIVEAU" as const, bloquant: false };
  if (e.servicesRealises.includes("NIVEAU")) return { ...base, etat: "FAIT", acquis: true, raison: "Mise à niveau réalisée avec le cabinet." };
  if (e.niveauEvalue === "SUFFISANT") return { ...base, etat: "FAIT", acquis: true, raison: "Niveau évalué « suffisant » par le cabinet." };
  if (e.niveauEvalue === "INSUFFISANT") return { ...base, etat: "MANQUANT", acquis: false, raison: "Niveau évalué « insuffisant » par le cabinet." };
  // Avant évaluation : bureautique et expérience suffisantes (seuils paramétrables).
  const annees = e.aTravaille && e.trancheExperience ? ANNEES_MIN_TRANCHE[e.trancheExperience] : 0;
  const bureautiqueOk = e.aTravaille === true && e.bureautique !== null && rangBureautique(e.bureautique) >= rangBureautique(p.bureautiqueMinimum);
  const experienceOk = e.aTravaille === true && annees >= p.experienceMinimumAnnees;
  if (bureautiqueOk && experienceOk) {
    return { ...base, etat: "EN_ATTENTE", acquis: true, raison: "Bureautique et expérience suffisantes ; niveau à confirmer par le cabinet." };
  }
  const manques = [!bureautiqueOk && "niveau en bureautique", !experienceOk && "années d'expérience"].filter(Boolean).join(" et ");
  return { ...base, etat: "MANQUANT", acquis: false, raison: `Pas encore suffisant : ${manques}.` };
}

/** Calcule le grade provisoire et son explication. */
export function classer(e: EntreeClassement, p: ParametresClassement): ResultatClassement {
  const diplome = elementDiplome(e);
  const test = elementTest(e);
  const coaching = elementCoaching(e);
  const niveau = elementNiveau(e, p);
  const elements = [diplome, test, coaching, niveau];
  const aExperience = e.aTravaille === true;

  // Suggestions (R-12) : un service pour chaque élément manquant qu'un service peut combler.
  const manquants = elements
    .filter((x) => !x.acquis && x.element !== "DIPLOME")
    .map((x) => x.element as ElementComblable);

  if (!diplome.acquis && !aExperience) {
    return { grade: "HORS_BASSIN", regle: "R-03", elements, suggestions: [] };
  }
  if (!diplome.acquis) {
    // R-13 : au grade D, les services suggérés sont fixés par les paramètres.
    const suggestionsD = p.elementsSuggeresGradeD.filter(
      (x): x is ElementComblable => x !== "DIPLOME" && !elements.find((y) => y.element === x)?.acquis,
    );
    return { grade: "D", regle: "R-04", elements, suggestions: suggestionsD };
  }
  if (test.acquis && niveau.acquis && coaching.acquis) {
    // Une pièce refusée empêche le grade A (W5).
    if (elements.some((x) => x.bloquant)) return { grade: "C", regle: "R-05", elements, suggestions: manquants };
    return { grade: "A", regle: "R-01", elements, suggestions: [] };
  }
  if (test.acquis && niveau.acquis) return { grade: "B", regle: "R-02", elements, suggestions: ["COACHING"] };
  return { grade: "C", regle: "R-05", elements, suggestions: manquants };
}

/** Meilleur état d'une pièce parmi plusieurs exemplaires : vérifiée > déposée > refusée. */
export function meilleurEtat(etats: EtatPieceClassement[]): EtatPieceClassement | undefined {
  if (etats.includes("VERIFIEE")) return "VERIFIEE";
  if (etats.includes("DEPOSEE")) return "DEPOSEE";
  if (etats.includes("REFUSEE")) return "REFUSEE";
  return undefined;
}

/** R-08 : pièces requises pour confirmer un A qui ne sont pas encore vérifiées. */
export function piecesNonVerifieesPourA(e: Pick<EntreeClassement, "pieces">, p: ParametresClassement): TypePiece[] {
  return p.piecesRequisesGradeA.filter((t) => e.pieces[t] !== "VERIFIEE");
}
