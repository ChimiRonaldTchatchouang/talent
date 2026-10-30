import { hash, verify } from "@node-rs/argon2";

// Argon2id, paramètres recommandés par l'OWASP (19 Mio, 2 passes).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return hash(motDePasse, OPTIONS);
}

export async function verifierMotDePasse(empreinte: string, motDePasse: string): Promise<boolean> {
  try {
    return await verify(empreinte, motDePasse);
  } catch {
    return false;
  }
}

/** Empreinte factice pour garder un temps de réponse constant quand le compte n'existe pas. */
let empreinteFactice: Promise<string> | undefined;
export function empreinteLeurre(): Promise<string> {
  empreinteFactice ??= hash("mot-de-passe-leurre", OPTIONS);
  return empreinteFactice;
}
