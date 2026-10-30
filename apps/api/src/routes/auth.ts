import { analyserIdentifiant, CODES_ERREUR, schemaConnexion } from "@bdt/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { ErreurMetier } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { empreinteLeurre, verifierMotDePasse } from "../lib/mots-de-passe.js";
import { accesOuvert } from "../lib/recruteurs.js";
import { exigerConnexion, utilisateurDe, type UtilisateurConnecte } from "../plugins/authentification.js";

export const schemaUtilisateurPublic = z.object({
  id: z.string(),
  role: z.enum(["CANDIDAT", "ADMIN", "RECRUTEUR"]),
  nom: z.string().nullable(),
  email: z.string().nullable(),
  telephone: z.string().nullable(),
  estPrincipal: z.boolean(),
  emailConfirme: z.boolean(),
});

export function versPublic(u: UtilisateurConnecte): z.infer<typeof schemaUtilisateurPublic> {
  return {
    id: u.id,
    role: u.role,
    nom: u.nom,
    email: u.email,
    telephone: u.telephone,
    estPrincipal: u.estPrincipal,
    emailConfirme: u.emailVerifieLe !== null,
  };
}

const MESSAGE_IDENTIFIANTS = "Identifiant ou mot de passe incorrect.";

export function routesAuth(config: Config): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/auth/connexion",
      {
        config: { rateLimit: { max: 20, timeWindow: "5 minutes" } },
        schema: {
          tags: ["Comptes"],
          summary: "Se connecter avec un e-mail ou un téléphone",
          body: schemaConnexion,
          response: { 200: z.object({ utilisateur: schemaUtilisateurPublic }) },
        },
      },
      async (request, reply) => {
        const { identifiant, motDePasse } = request.body;
        const analyse = analyserIdentifiant(identifiant);
        const utilisateur = analyse
          ? await app.prisma.utilisateur.findUnique({
              where: analyse.type === "email" ? { email: analyse.valeur } : { telephone: analyse.valeur },
            })
          : null;

        if (!utilisateur) {
          // Même durée de traitement qu'un vrai compte : on ne révèle pas si le compte existe.
          await verifierMotDePasse(await empreinteLeurre(), motDePasse);
          throw new ErreurMetier(401, CODES_ERREUR.IDENTIFIANTS_INVALIDES, MESSAGE_IDENTIFIANTS);
        }

        const maintenant = new Date();
        if (utilisateur.bloqueJusquA && utilisateur.bloqueJusquA > maintenant) {
          const minutes = Math.ceil((utilisateur.bloqueJusquA.getTime() - maintenant.getTime()) / 60000);
          throw new ErreurMetier(
            429,
            CODES_ERREUR.TROP_DE_TENTATIVES,
            `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
          );
        }

        const valide = await verifierMotDePasse(utilisateur.motDePasseHash, motDePasse);
        if (!valide) {
          const tentatives = utilisateur.tentativesEchouees + 1;
          const bloquer = tentatives >= config.CONNEXION_ESSAIS_MAX;
          await app.prisma.utilisateur.update({
            where: { id: utilisateur.id },
            data: bloquer
              ? {
                  tentativesEchouees: 0,
                  bloqueJusquA: new Date(maintenant.getTime() + config.CONNEXION_BLOCAGE_MINUTES * 60000),
                }
              : { tentativesEchouees: tentatives },
          });
          await journaliser(app.prisma, {
            acteurId: utilisateur.id,
            role: utilisateur.role,
            action: bloquer ? "COMPTE_BLOQUE_TEMPORAIREMENT" : "CONNEXION_ECHOUEE",
            cibleType: "utilisateur",
            cibleId: utilisateur.id,
            ip: request.ip,
          });
          throw new ErreurMetier(401, CODES_ERREUR.IDENTIFIANTS_INVALIDES, MESSAGE_IDENTIFIANTS);
        }

        if (utilisateur.role === "RECRUTEUR") {
          const acces = await app.prisma.accesRecruteur.findUnique({ where: { utilisateurId: utilisateur.id } });
          if (!acces || !accesOuvert(acces)) {
            await journaliser(app.prisma, { acteurId: utilisateur.id, role: "RECRUTEUR", action: "CONNEXION_ACCES_EXPIRE", cibleType: "utilisateur", cibleId: utilisateur.id, ip: request.ip });
            throw new ErreurMetier(403, CODES_ERREUR.ACCES_EXPIRE, "Votre accès a expiré, contactez le cabinet.");
          }
        }

        if (utilisateur.etat !== "ACTIF") {
          throw new ErreurMetier(
            403,
            CODES_ERREUR.COMPTE_DESACTIVE,
            "Ce compte est désactivé. Contactez le cabinet pour le réactiver.",
          );
        }

        await app.prisma.utilisateur.update({
          where: { id: utilisateur.id },
          data: { tentativesEchouees: 0, bloqueJusquA: null, derniereConnexion: maintenant },
        });
        await app.ouvrirSession(reply, utilisateur);
        await journaliser(app.prisma, {
          acteurId: utilisateur.id,
          role: utilisateur.role,
          action: "CONNEXION",
          cibleType: "utilisateur",
          cibleId: utilisateur.id,
          ip: request.ip,
        });
        return { utilisateur: versPublic(utilisateur) };
      },
    );

    app.post(
      "/auth/deconnexion",
      { schema: { tags: ["Comptes"], summary: "Se déconnecter", response: { 204: z.null() } } },
      async (request, reply) => {
        await app.fermerSession(request, reply);
        return reply.code(204).send(null);
      },
    );

    app.get(
      "/auth/moi",
      {
        onRequest: exigerConnexion,
        schema: {
          tags: ["Comptes"],
          summary: "Utilisateur connecté",
          response: { 200: z.object({ utilisateur: schemaUtilisateurPublic }) },
        },
      },
      async (request) => ({ utilisateur: versPublic(utilisateurDe(request)) }),
    );
  };
}
