import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { exigerRole } from "../plugins/authentification.js";

const TAILLE_PAGE = 50;

export const routesJournal: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/admin/journal",
    {
      onRequest: exigerRole("ADMIN"),
      schema: {
        tags: ["Journal"],
        summary: "Consulter le journal des actions (lecture seule)",
        querystring: z.object({ page: z.coerce.number().int().min(1).default(1) }),
        response: {
          200: z.object({
            total: z.number(),
            page: z.number(),
            entrees: z.array(
              z.object({
                id: z.string(),
                acteur: z.string().nullable(),
                role: z.string().nullable(),
                action: z.string(),
                cibleType: z.string().nullable(),
                cibleId: z.string().nullable(),
                creeLe: z.date(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const { page } = request.query;
      const [total, lignes] = await Promise.all([
        app.prisma.journal.count(),
        app.prisma.journal.findMany({
          orderBy: { id: "desc" },
          skip: (page - 1) * TAILLE_PAGE,
          take: TAILLE_PAGE,
        }),
      ]);
      const ids = [...new Set(lignes.map((l) => l.acteurId).filter((v): v is string => v !== null))];
      const acteurs = await app.prisma.utilisateur.findMany({
        where: { id: { in: ids } },
        select: { id: true, nom: true, email: true, telephone: true },
      });
      const noms = new Map(acteurs.map((a) => [a.id, a.nom ?? a.email ?? a.telephone ?? "Compte"]));
      return {
        total,
        page,
        entrees: lignes.map((l) => ({
          id: l.id.toString(),
          acteur: l.acteurId ? (noms.get(l.acteurId) ?? "Compte supprimé") : null,
          role: l.role,
          action: l.action,
          cibleType: l.cibleType,
          cibleId: l.cibleId,
          creeLe: l.creeLe,
        })),
      };
    },
  );
};
