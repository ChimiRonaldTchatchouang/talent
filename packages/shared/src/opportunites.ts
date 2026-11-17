import { z } from "zod";
import type { Grade } from "./grades.js";

/** Grades qu'une offre peut exiger (le « hors bassin » n'est pas un grade). */
export const GRADES_OFFRE = ["A", "B", "C", "D"] as const;
export type GradeOffre = (typeof GRADES_OFFRE)[number];

/** Rang d'un grade : A est le plus élevé, « hors bassin » le plus bas. */
export const RANG_GRADE: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, HORS_BASSIN: 0 };

/** Vrai si le grade du candidat est égal ou supérieur au grade requis. */
export function gradeSuffisant(grade: Grade | null | undefined, requis: GradeOffre): boolean {
  return !!grade && RANG_GRADE[grade] >= RANG_GRADE[requis];
}

const texteCourt = (nom: string, max: number) => z.string().trim().min(1, `${nom} est obligatoire.`).max(max, `${nom} est trop long (${max} caractères maximum).`);
const facultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const schemaOffre = z.object({
  titre: texteCourt("Le titre", 140),
  pays: texteCourt("Le pays", 80),
  ville: facultatif(80),
  domaine: facultatif(80),
  typeContrat: facultatif(80),
  description: texteCourt("La description", 8000),
  gradeRequis: z.enum(GRADES_OFFRE, { message: "Choisissez le grade requis." }),
  dateLimite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
    .optional()
    .nullable()
    .transform((v) => v || null),
  publiee: z.boolean().default(true),
});
export type EntreeOffre = z.input<typeof schemaOffre>;

/**
 * Lien WhatsApp « clic pour discuter » (wa.me) : ouvre une conversation avec le numéro, message prérempli.
 * Le numéro est attendu au format international (+237…) ; seuls les chiffres sont gardés.
 */
export function lienWhatsApp(telephone: string, message: string): string | null {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.length < 8 || chiffres.length > 15) return null;
  return `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`;
}
