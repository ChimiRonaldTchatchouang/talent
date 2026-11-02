import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerEmail, expediteur, modeles } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { ecrireReglages, lireReglages, schemaReglages } from "../lib/reglages.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

/** Réglages de la plateforme et journal des e-mails (côté administrateur). */
export const routesPlateformeAdmin = (config: Config): FastifyPluginAsyncZod => async (app) => {
  const admin = exigerRole("ADMIN");

  app.get(
    "/admin/reglages",
    { onRequest: admin, schema: { tags: ["Réglages"], summary: "Coordonnées du cabinet affichées aux candidats", response: { 200: schemaReglages } } },
    async () => lireReglages(app.prisma),
  );

  app.put(
    "/admin/reglages",
    {
      onRequest: admin,
      schema: { tags: ["Réglages"], summary: "Modifier les coordonnées du cabinet", body: schemaReglages, response: { 200: schemaReglages } },
    },
    async (request) => {
      const acteur = utilisateurDe(request);
      await ecrireReglages(app.prisma, request.body);
      await journaliser(app.prisma, { acteurId: acteur.id, role: acteur.role, action: "REGLAGES_MODIFIES", cibleType: "reglages", details: request.body, ip: request.ip });
      return lireReglages(app.prisma);
    },
  );

  app.get(
    "/admin/emails",
    {
      onRequest: admin,
      schema: {
        tags: ["Réglages"],
        summary: "Derniers e-mails (envoyés, en échec, ou écrits en mode démo)",
        response: {
          200: z.object({
            modeDemo: z.boolean(),
            expediteur: z.string().nullable(),
            emails: z.array(
              z.object({
                id: z.string(),
                destinataire: z.string(),
                sujet: z.string(),
                texte: z.string(),
                html: z.string().nullable(),
                statut: z.enum(["ENVOYE", "ECHEC", "DEMO"]),
                erreur: z.string().nullable(),
                creeLe: z.date(),
              }),
            ),
          }),
        },
      },
    },
    async () => ({
      modeDemo: !config.RESEND_API_KEY,
      expediteur: config.RESEND_API_KEY ? expediteur(config) : null,
      emails: await app.prisma.emailEnvoye.findMany({ orderBy: { creeLe: "desc" }, take: 100 }),
    }),
  );

  app.post(
    "/admin/emails/test",
    {
      onRequest: admin,
      schema: {
        tags: ["Réglages"],
        summary: "Envoyer un e-mail de test à l'administrateur connecté (vérifie la configuration de Resend)",
        response: { 200: z.object({ statut: z.enum(["ENVOYE", "ECHEC", "DEMO"]), erreur: z.string().nullable(), destinataire: z.string() }) },
      },
    },
    async (request) => {
      const acteur = utilisateurDe(request);
      if (!acteur.email) throw erreurs.invalide("Votre compte n'a pas d'adresse e-mail.");
      await envoyerEmail(app.prisma, config, acteur.email, modeles.test(`${config.URL_SITE.replace(/\/+$/, "")}/admin`));
      const dernier = await app.prisma.emailEnvoye.findFirstOrThrow({ where: { destinataire: acteur.email }, orderBy: { creeLe: "desc" } });
      return { statut: dernier.statut, erreur: dernier.erreur, destinataire: acteur.email };
    },
  );
};
