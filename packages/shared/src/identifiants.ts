import { z } from "zod";

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;
export const INDICATIF_PAR_DEFAUT = "+237";

/**
 * Normalise un numéro de téléphone au format international (+XXXXXXXX).
 * Un numéro camerounais à 9 chiffres saisi sans indicatif reçoit +237.
 * Retourne null si le numéro n'est pas exploitable.
 */
export function normaliserTelephone(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s.\-()]/g, "");
  let numero = nettoye;
  if (numero.startsWith("00")) numero = `+${numero.slice(2)}`;
  if (!numero.startsWith("+")) {
    if (/^\d{9}$/.test(numero)) numero = `${INDICATIF_PAR_DEFAUT}${numero}`;
    else if (/^237\d{9}$/.test(numero)) numero = `+${numero}`;
    else return null;
  }
  if (!/^\+\d{8,15}$/.test(numero)) return null;
  return numero;
}

export function normaliserEmail(saisie: string): string {
  return saisie.trim().toLowerCase();
}

/** Un identifiant de connexion est soit un e-mail, soit un téléphone. */
export function analyserIdentifiant(
  saisie: string,
): { type: "email"; valeur: string } | { type: "telephone"; valeur: string } | null {
  const brut = saisie.trim();
  if (brut.includes("@")) {
    const email = normaliserEmail(brut);
    return z.string().email().safeParse(email).success ? { type: "email", valeur: email } : null;
  }
  const tel = normaliserTelephone(brut);
  return tel ? { type: "telephone", valeur: tel } : null;
}

export const schemaMotDePasse = z
  .string()
  .min(LONGUEUR_MIN_MOT_DE_PASSE, `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`)
  .max(128, "Le mot de passe est trop long (128 caractères maximum).");

export const schemaConnexion = z.object({
  identifiant: z.string().trim().min(1, "Saisissez votre e-mail ou votre numéro de téléphone."),
  motDePasse: z.string().min(1, "Saisissez votre mot de passe."),
});
export type EntreeConnexion = z.infer<typeof schemaConnexion>;

export const schemaCreationAdmin = z.object({
  nom: z.string().trim().min(2, "Indiquez le nom complet.").max(120),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  motDePasse: schemaMotDePasse,
});
export type EntreeCreationAdmin = z.infer<typeof schemaCreationAdmin>;
