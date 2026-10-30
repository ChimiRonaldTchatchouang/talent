import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, TypeJeton } from "@prisma/client";

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export const DUREE_JETON_HEURES: Record<TypeJeton, number> = {
  CONFIRMATION_EMAIL: 72,
  REINITIALISATION: 1,
};

/** Crée un jeton à usage unique et renvoie sa valeur (seule l'empreinte est stockée). */
export async function creerJeton(db: PrismaClient, type: TypeJeton, utilisateurId: string): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");
  await db.jeton.create({
    data: {
      id: empreinte(jeton),
      type,
      utilisateurId,
      expireLe: new Date(Date.now() + DUREE_JETON_HEURES[type] * 3600 * 1000),
    },
  });
  return jeton;
}

/** Consomme un jeton valide : renvoie l'utilisateur concerné, ou null si le jeton est invalide, expiré ou déjà utilisé. */
export async function consommerJeton(db: PrismaClient, type: TypeJeton, jeton: string): Promise<string | null> {
  const resultat = await db.jeton.updateMany({
    where: { id: empreinte(jeton), type, utiliseLe: null, expireLe: { gt: new Date() } },
    data: { utiliseLe: new Date() },
  });
  if (resultat.count === 0) return null;
  const ligne = await db.jeton.findUnique({ where: { id: empreinte(jeton) } });
  return ligne?.utilisateurId ?? null;
}
