import type { Prisma, PrismaClient, Role } from "@prisma/client";

export interface EntreeJournal {
  acteurId?: string | null;
  role?: Role | null;
  action: string;
  cibleType?: string;
  cibleId?: string;
  details?: Prisma.InputJsonValue;
  ip?: string;
}

type ClientJournal = Pick<PrismaClient, "journal"> | Prisma.TransactionClient;

/** Inscrit une action au journal. Le journal n'est jamais modifié ni supprimé. */
export async function journaliser(db: ClientJournal, entree: EntreeJournal): Promise<void> {
  await db.journal.create({
    data: {
      acteurId: entree.acteurId ?? null,
      role: entree.role ?? null,
      action: entree.action,
      cibleType: entree.cibleType ?? null,
      cibleId: entree.cibleId ?? null,
      details: entree.details,
      ip: entree.ip ?? null,
    },
  });
}
