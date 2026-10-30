export const GRADES = ["A", "B", "C", "D", "HORS_BASSIN"] as const;
export type Grade = (typeof GRADES)[number];

/** Libellés de la charte (section 12). La lettre accompagne toujours la couleur. */
export const LIBELLES_GRADES: Record<Grade, { lettre: string; libelle: string }> = {
  A: { lettre: "A", libelle: "Prêt à l'emploi" },
  B: { lettre: "B", libelle: "Coaching manquant" },
  C: { lettre: "C", libelle: "Mise à niveau requise" },
  D: { lettre: "D", libelle: "Expérience sans diplôme" },
  HORS_BASSIN: { lettre: "–", libelle: "Hors bassin — à orienter" },
};

export const ETATS_GRADE = ["PROVISOIRE", "CONFIRME", "CORRIGE"] as const;
export type EtatGrade = (typeof ETATS_GRADE)[number];

/** État d'un élément évalué, dans l'explication du grade (M5). */
export const ETATS_ELEMENT = ["FAIT", "EN_ATTENTE", "MANQUANT"] as const;
export type EtatElement = (typeof ETATS_ELEMENT)[number];
export const LIBELLES_ETATS_ELEMENT: Record<EtatElement, string> = {
  FAIT: "Fait",
  EN_ATTENTE: "En attente de vérification",
  MANQUANT: "Manquant",
};

export const NIVEAUX_EVALUES = ["NON_EVALUE", "INSUFFISANT", "SUFFISANT"] as const;
export type NiveauEvalue = (typeof NIVEAUX_EVALUES)[number];
export const LIBELLES_NIVEAUX_EVALUES: Record<NiveauEvalue, string> = {
  NON_EVALUE: "Non évalué",
  INSUFFISANT: "Insuffisant",
  SUFFISANT: "Suffisant",
};

/** États d'un service pour un candidat (M6). Seul l'administrateur avance au-delà de « Intéressé ». */
export const ETATS_SERVICE = ["SUGGERE", "INTERESSE", "ACCEPTE", "EN_COURS", "REALISE", "ANNULE"] as const;
export type EtatService = (typeof ETATS_SERVICE)[number];
export const LIBELLES_ETATS_SERVICE: Record<EtatService, string> = {
  SUGGERE: "Suggéré",
  INTERESSE: "Intéressé",
  ACCEPTE: "Accepté",
  EN_COURS: "En cours",
  REALISE: "Réalisé",
  ANNULE: "Annulé",
};

/** Suivi par le cabinet d'un candidat retenu dans une sélection de recruteur (M9). */
export const STATUTS_LIGNE_SELECTION = ["A_CONTACTER", "MIS_EN_RELATION", "RETENU", "NON_RETENU"] as const;
export type StatutLigneSelection = (typeof STATUTS_LIGNE_SELECTION)[number];
export const LIBELLES_STATUTS_LIGNE: Record<StatutLigneSelection, string> = {
  A_CONTACTER: "À contacter",
  MIS_EN_RELATION: "Mis en relation",
  RETENU: "Retenu par l'employeur",
  NON_RETENU: "Non retenu",
};
