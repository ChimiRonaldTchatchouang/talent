/** Format standard des erreurs renvoyées par l'API. */
export interface ErreurApi {
  erreur: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export const CODES_ERREUR = {
  NON_CONNECTE: "NON_CONNECTE",
  ACCES_REFUSE: "ACCES_REFUSE",
  INTROUVABLE: "INTROUVABLE",
  DONNEES_INVALIDES: "DONNEES_INVALIDES",
  CONFLIT: "CONFLIT",
  TROP_DE_TENTATIVES: "TROP_DE_TENTATIVES",
  IDENTIFIANTS_INVALIDES: "IDENTIFIANTS_INVALIDES",
  COMPTE_DESACTIVE: "COMPTE_DESACTIVE",
  ACCES_EXPIRE: "ACCES_EXPIRE",
  ERREUR_INTERNE: "ERREUR_INTERNE",
} as const;
export type CodeErreur = (typeof CODES_ERREUR)[keyof typeof CODES_ERREUR];
