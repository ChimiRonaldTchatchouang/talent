import { z } from "zod";
import { NIVEAUX_BUREAUTIQUE, TRANCHES_EXPERIENCE, TYPES_PIECE } from "./parametres.js";

/** Étapes du dossier, dans l'ordre du parcours (section 5, W2). */
export const ETAPES = ["PERSONNEL", "DIPLOME", "LANGUES", "TRAVAIL", "FAMILLE", "JUSTIFICATIFS"] as const;
export type Etape = (typeof ETAPES)[number];
/** Étapes remplies par formulaire (les justificatifs ont leur propre écran). */
export const ETAPES_FORMULAIRE = ["PERSONNEL", "DIPLOME", "LANGUES", "TRAVAIL", "FAMILLE"] as const;
export type EtapeFormulaire = (typeof ETAPES_FORMULAIRE)[number];

export const LIBELLES_ETAPES: Record<Etape, string> = {
  PERSONNEL: "Informations personnelles",
  DIPLOME: "Études et diplôme",
  LANGUES: "Langues et test de langue",
  TRAVAIL: "Expérience professionnelle",
  FAMILLE: "Situation familiale",
  JUSTIFICATIFS: "Justificatifs",
};

export const ETATS_ETAPE = ["A_FAIRE", "EN_COURS", "TERMINE", "SAUTE"] as const;
export type EtatEtape = (typeof ETATS_ETAPE)[number];
export const LIBELLES_ETATS_ETAPE: Record<EtatEtape, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  SAUTE: "Sauté",
};

export const STATUTS_DOSSIER = ["BROUILLON", "ENVOYE"] as const;
export type StatutDossier = (typeof STATUTS_DOSSIER)[number];

export const SEXES = ["FEMME", "HOMME"] as const;
export const LIBELLES_SEXES = { FEMME: "Femme", HOMME: "Homme" } as const;

export const SITUATIONS = ["CELIBATAIRE", "MARIE", "UNION_LIBRE", "AUTRE"] as const;
export type Situation = (typeof SITUATIONS)[number];
export const LIBELLES_SITUATIONS: Record<Situation, string> = {
  CELIBATAIRE: "Célibataire",
  MARIE: "Marié(e)",
  UNION_LIBRE: "Union libre",
  AUTRE: "Autre",
};
export const SITUATIONS_AVEC_CONJOINT: readonly Situation[] = ["MARIE", "UNION_LIBRE"];

export const ENFANTS = ["AUCUN", "UN", "DEUX", "TROIS_PLUS"] as const;
export const LIBELLES_ENFANTS = { AUCUN: "0", UN: "1", DEUX: "2", TROIS_PLUS: "3 ou plus" } as const;

/** Langues proposées dans « langues parlées » (choix multiple). */
export const LANGUES_PARLEES = [
  "Français",
  "Anglais",
  "Allemand",
  "Espagnol",
  "Italien",
  "Portugais",
  "Arabe",
  "Chinois",
] as const;

export const ETATS_PIECE = ["DEPOSEE", "VERIFIEE", "REFUSEE"] as const;
export type EtatPiece = (typeof ETATS_PIECE)[number];
/** Une pièce sans fichier est « À déposer » (pas de ligne en base). */
export const LIBELLES_ETATS_PIECE = {
  A_DEPOSER: "À déposer",
  DEPOSEE: "Déposée (en attente)",
  VERIFIEE: "Vérifiée",
  REFUSEE: "Refusée",
} as const;

export const TYPES_FICHIER_ACCEPTES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

// ---------- Saisie de chaque étape ----------
// Les champs sont tous facultatifs à l'enregistrement automatique (brouillon) ;
// « verifierEtape » (côté API) contrôle qu'une étape est complète.

const texte = (max = 120) => z.string().trim().max(max, `${max} caractères maximum.`);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const mois = z.string().regex(/^\d{4}-\d{2}$/, "Mois invalide (AAAA-MM).");
const uuid = z.string().uuid("Choix invalide.");
const nul = <T extends z.ZodTypeAny>(s: T) => s.nullable().optional();

export const schemaPersonnel = z.object({
  nom: nul(texte()),
  prenoms: nul(texte()),
  dateNaissance: nul(date),
  sexe: nul(z.enum(SEXES)),
  nationalite: nul(texte(80)),
  ville: nul(texte(80)),
  telephoneContact: nul(texte(30)),
  emailContact: nul(z.string().trim().toLowerCase().email("Adresse e-mail invalide.").or(z.literal(""))),
  languesParlees: z.array(texte(40)).max(15).optional(),
  aPasseport: nul(z.boolean()),
  passeportExpiration: nul(date),
});

export const schemaEtapeDiplome = z.object({
  aDiplome: nul(z.boolean()),
  diplomeId: nul(uuid),
  diplomeIntitule: nul(texte(160)),
  filiere: nul(texte(120)),
  etablissement: nul(texte(160)),
  diplomeAnnee: nul(z.number().int().min(1950, "Année invalide.").max(2100, "Année invalide.")),
  diplomePays: nul(texte(80)),
});

export const schemaLangues = z.object({
  aTestLangue: nul(z.boolean()),
  testLangueId: nul(uuid),
  testScore: nul(z.number().min(0, "Le score ne peut pas être négatif.").max(10000)),
  testDate: nul(date),
});

export const schemaExperience = z.object({
  employeur: texte(160),
  poste: texte(120),
  debut: nul(mois),
  fin: nul(mois),
  ville: nul(texte(80)),
});

export const schemaTravail = z.object({
  aTravaille: nul(z.boolean()),
  domaineId: nul(uuid),
  metier: nul(texte(120)),
  trancheExperience: nul(z.enum(TRANCHES_EXPERIENCE)),
  bureautique: nul(z.enum(NIVEAUX_BUREAUTIQUE)),
  experiences: z.array(schemaExperience).max(30).optional(),
  competenceIds: z.array(uuid).max(40).optional(),
});

export const schemaFamille = z.object({
  situation: nul(z.enum(SITUATIONS)),
  conjointNom: nul(texte()),
  conjointProfession: nul(texte()),
  conjointPasseport: nul(z.boolean()),
  enfants: nul(z.enum(ENFANTS)),
  partAvecAccompagnants: nul(z.boolean()),
  nombreAccompagnants: nul(z.number().int().min(1, "Au moins 1 personne.").max(20)),
});

export const SCHEMAS_ETAPES = {
  PERSONNEL: schemaPersonnel,
  DIPLOME: schemaEtapeDiplome,
  LANGUES: schemaLangues,
  TRAVAIL: schemaTravail,
  FAMILLE: schemaFamille,
} as const;

export const schemaEnregistrementEtape = z.object({
  /** Données saisies (partielles autorisées). */
  donnees: z.record(z.unknown()),
  /** true quand le candidat clique « Continuer » : l'étape doit être complète. */
  terminer: z.boolean().default(false),
});

export const schemaInscription = z.object({
  identifiant: z.string().trim().min(1, "Saisis ton e-mail ou ton numéro de téléphone."),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe est trop long (128 caractères maximum)."),
  consentementTraitement: z.boolean(),
  consentementRecruteurs: z.boolean(),
});

export const schemaTypePiece = z.enum(TYPES_PIECE);
