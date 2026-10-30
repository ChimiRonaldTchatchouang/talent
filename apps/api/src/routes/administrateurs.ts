import { schemaCreationAdmin } from "@bdt/shared";
import { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { hacherMotDePasse } from "../lib/mots-de-passe.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const sAdmin = z.object({
  id: z.string(),
  nom: z.string().nullable(),
  email: z.string().nullable(),
  etat: z.enum(["ACTIF", "DESACTIVE"]),
  estPrincipal: z.boolean(),
  derniereConnexion: z.date().nullable(),
  creeLe: z.date(),
});
const selection = {
  id: true,
  nom: true,
  email: true,
  etat: true,
  estPrincipal: true,
  derniereConnexion: true,
  creeLe: true,
} as const;

export const routesAdministrateurs: FastifyPluginAsyncZod = async (app) => {
  const admin = exigerRole("ADMIN");

  app.get(
    "/admin/administrateurs",
    {
      onRequest: admin,
      schema: {
        tags: ["Administrateurs"],
        summary: "Lister les comptes administrateurs",
        response: { 200: z.object({ administrateurs: z.array(sAdmin) }) },
      },
    },
    async () => ({
      administrateurs: await app.prisma.utilisateur.findMany({
        where: { role: "ADMIN" },
        select: selection,
        orderBy: { creeLe: "asc" },
      }),
    }),
  );

  app.post(
    "/admin/administrateurs",
    {
      onRequest: admin,
      schema: {
        tags: ["Administrateurs"],
        summary: "Créer un compte administrateur (administrateur principal uniquement)",
        body: schemaCreationAdmin,
        response: { 201: z.object({ administrateur: sAdmin }) },
      },
    },
    async (request, reply) => {
      const acteur = utilisateurDe(request);
      if (!acteur.estPrincipal) throw erreurs.accesRefuse();
      const { nom, email, motDePasse } = request.body;
      const administrateur = await app.prisma.utilisateur
        .create({
          data: {
            role: "ADMIN",
            nom,
            email,
            motDePasseHash: await hacherMotDePasse(motDePasse),
            creeParId: acteur.id,
          },
          select: selection,
        })
        .catch((e: unknown) => {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            throw erreurs.conflit("Cette adresse e-mail a déjà un compte.");
          }
          throw e;
        });
      await journaliser(app.prisma, {
        acteurId: acteur.id,
        role: acteur.role,
        action: "ADMINISTRATEUR_CREE",
        cibleType: "utilisateur",
        cibleId: administrateur.id,
        ip: request.ip,
      });
      return reply.code(201).send({ administrateur });
    },
  );

  app.patch(
    "/admin/administrateurs/:id",
    {
      onRequest: admin,
      schema: {
        tags: ["Administrateurs"],
        summary: "Désactiver ou réactiver un administrateur (administrateur principal uniquement)",
        params: z.object({ id: z.string().uuid("Identifiant invalide.") }),
        body: z.object({ etat: z.enum(["ACTIF", "DESACTIVE"]) }),
        response: { 200: z.object({ administrateur: sAdmin }) },
      },
    },
    async (request) => {
      const acteur = utilisateurDe(request);
      if (!acteur.estPrincipal) throw erreurs.accesRefuse();
      const cible = await app.prisma.utilisateur.findFirst({ where: { id: request.params.id, role: "ADMIN" } });
      if (!cible) throw erreurs.introuvable("L'administrateur");
      if (cible.estPrincipal) throw erreurs.conflit("Le compte administrateur principal ne peut pas être désactivé.");
      const administrateur = await app.prisma.$transaction(async (tx) => {
        const maj = await tx.utilisateur.update({
          where: { id: cible.id },
          data: { etat: request.body.etat },
          select: selection,
        });
        if (request.body.etat === "DESACTIVE") await tx.session.deleteMany({ where: { utilisateurId: cible.id } });
        await journaliser(tx, {
          acteurId: acteur.id,
          role: acteur.role,
          action: request.body.etat === "DESACTIVE" ? "ADMINISTRATEUR_DESACTIVE" : "ADMINISTRATEUR_REACTIVE",
          cibleType: "utilisateur",
          cibleId: cible.id,
          ip: request.ip,
        });
        return maj;
      });
      return { administrateur };
    },
  );
};
