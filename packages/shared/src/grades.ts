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
