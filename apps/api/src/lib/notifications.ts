import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Types de notification dans l'application. Le titre et le texte sont gardés en français (repli),
 * et `donnees` permet à l'interface de les réécrire dans la langue choisie par le candidat.
 */
export type TypeNotification =
  | "BIENVENUE"
  | "DOSSIER_ENVOYE"
  | "PIECE_REFUSEE"
  | "GRADE_MIS_A_JOUR"
  | "NOUVELLE_OFFRE"
  | "OFFRE_VERROUILLEE";

export interface EntreeNotification {
  type: TypeNotification;
  titre: string;
  texte: string;
  lien?: string;
  donnees?: Prisma.InputJsonValue;
}

type Client = Pick<PrismaClient, "notification"> | Prisma.TransactionClient;

/** Ajoute une notification dans l'application. Ne bloque jamais l'action en cours. */
export async function notifier(db: Client, utilisateurId: string, n: EntreeNotification): Promise<void> {
  await db.notification.create({ data: { utilisateurId, type: n.type, titre: n.titre, texte: n.texte, lien: n.lien ?? null, donnees: n.donnees } }).catch(() => undefined);
}

/** Même notification pour plusieurs utilisateurs. */
export async function notifierPlusieurs(db: Client, utilisateurIds: string[], n: EntreeNotification): Promise<void> {
  if (!utilisateurIds.length) return;
  await db.notification.createMany({
    data: utilisateurIds.map((utilisateurId) => ({ utilisateurId, type: n.type, titre: n.titre, texte: n.texte, lien: n.lien ?? null, donnees: n.donnees })),
  });
}
