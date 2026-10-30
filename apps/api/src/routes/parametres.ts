import { schemaParametresClassement } from "@bdt/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { recalculerTousLesGrades } from "../lib/classement.js";
import type { Config } from "../lib/config.js";
import { journaliser } from "../lib/journal.js";
import { parametresEnVigueur } from "../lib/parametres.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const sVersion = z.object({
  version: z.number().nullable(),
  valeurs: schemaParametresClassement,
  creeLe: z.date().nullable(),
});

export const routesParametres = (config: Config): FastifyPluginAsyncZod => async (app) => {
  const admin = exigerRole("ADMIN");

  app.get(
    "/admin/parametres-classement",
    {
      onRequest: admin,
      schema: { tags: ["Paramètres du classement"], summary: "Paramètres en vigueur", response: { 200: sVersion } },
    },
    async () => parametresEnVigueur(app.prisma),
  );

  app.put(
    "/admin/parametres-classement",
    {
      onRequest: admin,
      schema: {
        tags: ["Paramètres du classement"],
        summary: "Enregistrer une nouvelle version des paramètres",
        body: schemaParametresClassement,
        response: { 200: sVersion },
      },
    },
    async (request) => {
      const acteur = utilisateurDe(request);
      const avant = await parametresEnVigueur(app.prisma);
      const cree = await app.prisma.$transaction(async (tx) => {
        const version = await tx.parametresClassement.create({
          data: { valeurs: request.body, creeParId: acteur.id },
        });
        await journaliser(tx, {
          acteurId: acteur.id,
          role: acteur.role,
          action: "PARAMETRES_CLASSEMENT_MODIFIES",
          cibleType: "parametres_classement",
          cibleId: String(version.id),
          details: { avant: avant.valeurs, apres: request.body },
          ip: request.ip,
        });
        return version;
      });
      // T15 : tous les grades provisoires sont recalculés avec les nouveaux seuils.
      await recalculerTousLesGrades(app.prisma, config, acteur.id);
      return { version: cree.id, valeurs: request.body, creeLe: cree.creeLe };
    },
  );
};
