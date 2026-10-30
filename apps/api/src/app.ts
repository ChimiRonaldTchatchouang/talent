import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { CODES_ERREUR, MARQUE, TAILLE_MAX_FICHIER, type ErreurApi } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import Fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { Config } from "./lib/config.js";
import { ErreurMetier } from "./lib/erreurs.js";
import { secretLiens } from "./lib/reglages.js";
import { pluginAuthentification } from "./plugins/authentification.js";
import { routesAdmin } from "./routes/admin.js";
import { routesAdministrateurs } from "./routes/administrateurs.js";
import { routesAuth } from "./routes/auth.js";
import { routesCandidat } from "./routes/candidat.js";
import { routesClassement } from "./routes/classement.js";
import { routesComptesCandidat } from "./routes/comptes-candidat.js";
import { routesPieces } from "./routes/pieces.js";
import { routesPlateformeAdmin } from "./routes/plateforme-admin.js";
import { routesJournal } from "./routes/journal.js";
import { routesParametres } from "./routes/parametres.js";
import { routesReferentiels } from "./routes/referentiels.js";

function corps(code: string, message: string, details?: Record<string, string>): ErreurApi {
  return { erreur: { code, message, ...(details ? { details } : {}) } };
}

export async function construireApp(configBrute: Config, prisma: PrismaClient) {
  const config: Config & { SECRET_LIENS: string } = {
    ...configBrute,
    SECRET_LIENS: configBrute.SECRET_LIENS ?? (await secretLiens(prisma)),
  };
  const app = Fastify({
    logger: config.NODE_ENV === "test" ? false : { level: "info", redact: ["req.headers.cookie"] },
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("prisma", prisma);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.URL_SITE, credentials: true });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: TAILLE_MAX_FICHIER, files: 1, fields: 5 } });
  await app.register(rateLimit, {
    // Pas de limite de débit pendant les tests automatiques (ils enchaînent des dizaines de demandes).
    allowList: () => config.NODE_ENV === "test",
    max: 300,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      ...corps(CODES_ERREUR.TROP_DE_TENTATIVES, "Trop de demandes en peu de temps. Patientez quelques minutes."),
    }),
  });
  await app.register(swagger, {
    openapi: {
      info: { title: `API ${MARQUE.nom}`, version: "0.1.0", description: "API publique de la plateforme." },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/documentation" });
  await app.register(pluginAuthentification, { cookieSecurise: config.cookieSecurise });

  app.setErrorHandler((erreur: FastifyError, request, reply) => {
    if (erreur instanceof ErreurMetier) {
      return reply.code(erreur.statut).send(corps(erreur.code, erreur.message, erreur.details));
    }
    if (hasZodFastifySchemaValidationErrors(erreur)) {
      const details: Record<string, string> = {};
      for (const e of erreur.validation) {
        const champ = e.instancePath.replace(/^\//, "").replace(/\//g, ".") || "requete";
        details[champ] ??= e.message ?? "Valeur invalide.";
      }
      return reply
        .code(400)
        .send(corps(CODES_ERREUR.DONNEES_INVALIDES, "Certaines informations sont invalides. Vérifiez le formulaire.", details));
    }
    if (erreur.statusCode === 429) {
      return reply
        .code(429)
        .send(corps(CODES_ERREUR.TROP_DE_TENTATIVES, "Trop de demandes en peu de temps. Patientez quelques minutes."));
    }
    if (erreur.statusCode && erreur.statusCode < 500) {
      return reply.code(erreur.statusCode).send(corps(CODES_ERREUR.DONNEES_INVALIDES, "La demande est invalide."));
    }
    request.log.error(erreur);
    return reply
      .code(500)
      .send(corps(CODES_ERREUR.ERREUR_INTERNE, "Un problème technique est survenu. Réessayez dans un instant."));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send(corps(CODES_ERREUR.INTROUVABLE, "Cette adresse n'existe pas.")),
  );

  app.get("/sante", { schema: { hide: true } }, async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { statut: "ok" };
  });

  await app.register(routesAuth(config));
  await app.register(routesReferentiels);
  await app.register(routesParametres(config));
  await app.register(routesAdministrateurs);
  await app.register(routesJournal);
  await app.register(routesComptesCandidat(config));
  await app.register(routesCandidat(config));
  await app.register(routesPieces(config));
  await app.register(routesPlateformeAdmin(config));
  await app.register(routesClassement(config));
  await app.register(routesAdmin(config));

  return app;
}

export type App = Awaited<ReturnType<typeof construireApp>>;
