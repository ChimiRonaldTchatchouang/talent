import { z } from "zod";
import { ELEMENTS_GRADE } from "./referentiels.js";

export const NIVEAUX_BUREAUTIQUE = ["DEBUTANT", "MOYEN", "BON"] as const;
export type NiveauBureautique = (typeof NIVEAUX_BUREAUTIQUE)[number];

export const TRANCHES_EXPERIENCE = ["0-2", "3-5", "6-10", "10+"] as const;
export type TrancheExperience = (typeof TRANCHES_EXPERIENCE)[number];

export const TYPES_PIECE = [
  "IDENTITE",
  "DIPLOME",
  "ATTESTATION_LANGUE",
  "CERTIFICAT_TRAVAIL",
  "CV",
] as const;
export type TypePiece = (typeof TYPES_PIECE)[number];

/**
 * Paramètres du classement (section 6). Valeurs par défaut proposées par Nextiaa,
 * modifiables par l'administrateur sans toucher au code.
 */
export const schemaParametresClassement = z.object({
  /** Niveau provisoire acquis si bureautique >= ce niveau… */
  bureautiqueMinimum: z.enum(NIVEAUX_BUREAUTIQUE),
  /** … et si l'expérience déclarée est au moins de ce nombre d'années. */
  experienceMinimumAnnees: z.number().int().min(0).max(40),
  /** Éléments dont le service est suggéré par défaut au grade D (R-13). */
  elementsSuggeresGradeD: z.array(z.enum(ELEMENTS_GRADE)),
  /** Pièces qui doivent être vérifiées pour confirmer un grade A (R-08). */
  piecesRequisesGradeA: z.array(z.enum(TYPES_PIECE)).min(1),
  /** Alerte aux administrateurs N jours avant la fin d'un accès recruteur. */
  joursAlerteFinAccesRecruteur: z.number().int().min(1).max(30),
});
export type ParametresClassement = z.infer<typeof schemaParametresClassement>;

export const PARAMETRES_CLASSEMENT_PAR_DEFAUT: ParametresClassement = {
  bureautiqueMinimum: "BON",
  experienceMinimumAnnees: 3,
  elementsSuggeresGradeD: ["TEST_LANGUE", "COACHING"],
  piecesRequisesGradeA: ["IDENTITE", "DIPLOME", "ATTESTATION_LANGUE"],
  joursAlerteFinAccesRecruteur: 3,
};
