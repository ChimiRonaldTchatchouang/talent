export const ROLES = ["CANDIDAT", "ADMIN", "RECRUTEUR"] as const;
export type Role = (typeof ROLES)[number];

export const LIBELLES_ROLES: Record<Role, string> = {
  CANDIDAT: "Candidat",
  ADMIN: "Administrateur",
  RECRUTEUR: "Recruteur invité",
};

export const ETATS_COMPTE = ["ACTIF", "DESACTIVE"] as const;
export type EtatCompte = (typeof ETATS_COMPTE)[number];
