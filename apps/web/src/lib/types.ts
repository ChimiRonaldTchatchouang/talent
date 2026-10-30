import type { ParametresClassement, Role } from "@bdt/shared";

export interface UtilisateurPublic {
  id: string;
  role: Role;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  estPrincipal: boolean;
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
