import { PrismaClient } from "@prisma/client";

export function creerPrisma(url?: string): PrismaClient {
  return new PrismaClient(url ? { datasourceUrl: url } : undefined);
}
