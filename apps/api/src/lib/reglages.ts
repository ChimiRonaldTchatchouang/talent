import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

/** Réglages de la plateforme, modifiables par l'administrateur. */
export const schemaReglages = z.object({
  telephoneCabinet: z.string().trim().max(40).nullable(),
  emailCabinet: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").nullable().or(z.literal("").transform(() => null)),
});
export type Reglages = z.infer<typeof schemaReglages>;

const PAR_DEFAUT: Reglages = { telephoneCabinet: null, emailCabinet: null };

export async function lireReglages(db: PrismaClient): Promise<Reglages> {
  const ligne = await db.reglage.findUnique({ where: { cle: "plateforme" } });
  return { ...PAR_DEFAUT, ...((ligne?.valeur as Partial<Reglages> | undefined) ?? {}) };
}

export async function ecrireReglages(db: PrismaClient, valeurs: Reglages): Promise<void> {
  await db.reglage.upsert({ where: { cle: "plateforme" }, create: { cle: "plateforme", valeur: valeurs }, update: { valeur: valeurs } });
}

/** Clé de signature des liens : créée au hasard une seule fois, puis réutilisée à chaque démarrage. */
export async function secretLiens(db: PrismaClient): Promise<string> {
  const nouveau = randomBytes(48).toString("base64url");
  await db.reglage.upsert({ where: { cle: "secret_liens" }, create: { cle: "secret_liens", valeur: nouveau }, update: {} });
  const ligne = await db.reglage.findUniqueOrThrow({ where: { cle: "secret_liens" } });
  return ligne.valeur as string;
}
