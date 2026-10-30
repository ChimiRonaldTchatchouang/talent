import { z } from "zod";

/** Les quatre éléments évalués par le moteur de classement (section 6). */
export const ELEMENTS_GRADE = ["DIPLOME", "TEST_LANGUE", "COACHING", "NIVEAU"] as const;
export type ElementGrade = (typeof ELEMENTS_GRADE)[number];
export const LIBELLES_ELEMENTS: Record<ElementGrade, string> = {
  DIPLOME: "Diplôme",
  TEST_LANGUE: "Test de langue",
  COACHING: "Coaching",
  NIVEAU: "Niveau dans le domaine",
};

/** Éléments qu'un service du cabinet peut combler (le diplôme ne s'acquiert pas par un service). */
export const ELEMENTS_COMBLABLES = ["TEST_LANGUE", "COACHING", "NIVEAU"] as const;
export type ElementComblable = (typeof ELEMENTS_COMBLABLES)[number];

export const STATUTS_COMPETENCE = ["VALIDEE", "PROPOSEE", "REJETEE"] as const;
export type StatutCompetence = (typeof STATUTS_COMPETENCE)[number];

export const TYPES_REFERENTIEL = ["domaines", "competences", "tests-langue", "services", "diplomes"] as const;
export type TypeReferentiel = (typeof TYPES_REFERENTIEL)[number];

const nom = z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120, "Le nom est trop long.");

export const schemaDomaine = z.object({ nom });
export const schemaDomaineMaj = z.object({ nom: nom.optional(), actif: z.boolean().optional() });

export const schemaCompetence = z.object({ nom, domaineId: z.string().uuid("Domaine invalide.") });
export const schemaCompetenceMaj = z.object({
  nom: nom.optional(),
  domaineId: z.string().uuid("Domaine invalide.").optional(),
  actif: z.boolean().optional(),
});
export const schemaDecisionCompetence = z.object({ decision: z.enum(["VALIDEE", "REJETEE"]) });

const score = z.number({ invalid_type_error: "Le score doit être un nombre." }).min(0, "Le score ne peut pas être négatif.");
export const schemaTestLangue = z.object({ nom, scoreMinimum: score.nullable() });
export const schemaTestLangueMaj = z.object({
  nom: nom.optional(),
  scoreMinimum: score.nullable().optional(),
  actif: z.boolean().optional(),
});

export const schemaService = z.object({
  nom,
  description: z.string().trim().max(1000).default(""),
  duree: z.string().trim().max(120).default(""),
  elementComble: z.enum(ELEMENTS_COMBLABLES).nullable(),
});
export const schemaServiceMaj = z.object({
  nom: nom.optional(),
  description: z.string().trim().max(1000).optional(),
  duree: z.string().trim().max(120).optional(),
  elementComble: z.enum(ELEMENTS_COMBLABLES).nullable().optional(),
  actif: z.boolean().optional(),
});

export const schemaDiplome = z.object({ nom, ordre: z.number().int().min(0).max(100) });
export const schemaDiplomeMaj = z.object({
  nom: nom.optional(),
  ordre: z.number().int().min(0).max(100).optional(),
  actif: z.boolean().optional(),
});
