import type { ParametresClassement, Role } from "@bdt/shared";

export interface UtilisateurPublic {
  id: string;
  role: Role;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  estPrincipal: boolean;
  emailConfirme: boolean;
}

export interface Domaine {
  id: string;
  nom: string;
  actif: boolean;
}
export interface Competence {
  id: string;
  nom: string;
  domaineId: string;
  domaine: string;
  statut: "VALIDEE" | "PROPOSEE" | "REJETEE";
  actif: boolean;
}
export interface TestLangue {
  id: string;
  nom: string;
  scoreMinimum: number | null;
  actif: boolean;
}
export interface Service {
  id: string;
  nom: string;
  description: string;
  duree: string;
  elementComble: "TEST_LANGUE" | "COACHING" | "NIVEAU" | null;
  actif: boolean;
}
export interface Diplome {
  id: string;
  nom: string;
  ordre: number;
  actif: boolean;
}
export interface VersionParametres {
  version: number | null;
  valeurs: ParametresClassement;
  creeLe: string | null;
}
export interface Administrateur {
  id: string;
  nom: string | null;
  email: string | null;
  etat: "ACTIF" | "DESACTIVE";
  estPrincipal: boolean;
  derniereConnexion: string | null;
  creeLe: string;
}

export type EtatEtape = "A_FAIRE" | "EN_COURS" | "TERMINE" | "SAUTE";
export type EtapeId = "PERSONNEL" | "DIPLOME" | "LANGUES" | "TRAVAIL" | "FAMILLE" | "JUSTIFICATIFS";

export interface ExperienceSaisie {
  employeur: string;
  poste: string;
  debut: string | null;
  fin: string | null;
  ville: string | null;
}

/** Dossier tel que renvoyé au candidat par l'API. */
export interface Dossier {
  id: string;
  statut: "BROUILLON" | "ENVOYE";
  envoyeLe: string | null;
  consentementRecruteurs: boolean;
  nom: string | null;
  prenoms: string | null;
  dateNaissance: string | null;
  sexe: "FEMME" | "HOMME" | null;
  nationalite: string | null;
  ville: string | null;
  telephoneContact: string | null;
  emailContact: string | null;
  languesParlees: string[];
  aPasseport: boolean | null;
  passeportExpiration: string | null;
  aDiplome: boolean | null;
  diplomeId: string | null;
  diplome: string | null;
  diplomeIntitule: string | null;
  filiere: string | null;
  etablissement: string | null;
  diplomeAnnee: number | null;
  diplomePays: string | null;
  aTestLangue: boolean | null;
  testLangueId: string | null;
  testLangue: string | null;
  testScore: number | null;
  testDate: string | null;
  aTravaille: boolean | null;
  domaineId: string | null;
  domaine: string | null;
  metier: string | null;
  trancheExperience: string | null;
  bureautique: string | null;
  experiences: ExperienceSaisie[];
  competences: { id: string; nom: string; domaine: string; statut: string }[];
  situation: string | null;
  conjointNom: string | null;
  conjointProfession: string | null;
  conjointPasseport: boolean | null;
  enfants: string | null;
  partAvecAccompagnants: boolean | null;
  nombreAccompagnants: number | null;
}

export interface PieceDeposee {
  id: string;
  type: string;
  etat: "DEPOSEE" | "VERIFIEE" | "REFUSEE";
  motifRefus: string | null;
  nomFichier: string;
  deposeLe: string;
  ignoree: boolean;
  refus: { motif: string | null; le: string }[];
}

export interface ReponseDossier {
  dossier: Dossier;
  etapes: { etape: EtapeId; etat: EtatEtape }[];
  progression: number;
  etapeReprise: EtapeId | null;
  pretAEnvoyer: boolean;
  pieces: { requises: { type: string; manquante: boolean }[]; deposees: PieceDeposee[] };
}

export interface ListesReference {
  domaines: Domaine[];
  competences: Competence[];
  testsLangue: TestLangue[];
  services: Service[];
  diplomes: Diplome[];
}
