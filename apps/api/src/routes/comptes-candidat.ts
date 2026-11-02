import { analyserIdentifiant, CODES_ERREUR, MARQUE, schemaInscription, schemaMotDePasse } from "@bdt/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerEmail, modeles } from "../lib/emails.js";
import { ErreurMetier, erreurs } from "../lib/erreurs.js";
import { consommerJeton, creerJeton } from "../lib/jetons.js";
import { journaliser } from "../lib/journal.js";
import { hacherMotDePasse } from "../lib/mots-de-passe.js";
import { lireReglages } from "../lib/reglages.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";
import { schemaUtilisateurPublic, versPublic } from "./auth.js";

/** Inscription du candidat, confirmation de l'e-mail, mot de passe oublié (M1, W1). */
export function routesComptesCandidat(config: Config): FastifyPluginAsyncZod {
  const lien = (chemin: string) => `${config.URL_SITE.replace(/\/+$/, "")}${chemin}`;

  return async (app) => {
    app.get(
      "/plateforme",
      {
        schema: {
          tags: ["Comptes"],
          summary: "Informations publiques du cabinet (téléphone, e-mail)",
          response: { 200: z.object({ nom: z.string(), telephoneCabinet: z.string().nullable(), emailCabinet: z.string().nullable() }) },
        },
      },
      async () => ({ nom: MARQUE.nom, ...(await lireReglages(app.prisma)) }),
    );

    app.post(
      "/auth/inscription",
      {
        config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
        schema: {
          tags: ["Comptes"],
          summary: "Créer un compte candidat (e-mail ou téléphone) avec les consentements",
          body: schemaInscription,
          response: { 201: z.object({ utilisateur: schemaUtilisateurPublic }) },
        },
      },
      async (request, reply) => {
        const { identifiant, motDePasse, consentementTraitement, consentementRecruteurs } = request.body;
        const analyse = analyserIdentifiant(identifiant);
        if (!analyse) {
          throw erreurs.invalide("Vérifie ton e-mail ou ton numéro de téléphone.", {
            identifiant: "Saisis une adresse e-mail valide ou un numéro de téléphone (ex. 6 99 12 34 56).",
          });
        }
        if (!consentementTraitement) {
          throw erreurs.invalide("Ton accord est nécessaire pour continuer.", {
            consentementTraitement:
              "Sans ton accord, nous ne pouvons ni calculer ton grade ni t'accompagner. Coche la case pour continuer.",
          });
        }
        const existe = await app.prisma.utilisateur.findUnique({
          where: analyse.type === "email" ? { email: analyse.valeur } : { telephone: analyse.valeur },
        });
        if (existe) {
          throw erreurs.conflit(
            analyse.type === "email"
              ? "Cette adresse e-mail a déjà un compte. Connecte-toi, ou utilise « Mot de passe oublié »."
              : "Ce numéro a déjà un compte. Connecte-toi ou contacte le cabinet.",
          );
        }
        const maintenant = new Date();
        const utilisateur = await app.prisma.utilisateur
          .create({
            data: {
              role: "CANDIDAT",
              email: analyse.type === "email" ? analyse.valeur : null,
              telephone: analyse.type === "telephone" ? analyse.valeur : null,
              motDePasseHash: await hacherMotDePasse(motDePasse),
              dossier: {
                create: {
                  consentementTraitementLe: maintenant,
                  consentementRecruteursLe: consentementRecruteurs ? maintenant : null,
                  // On préremplit le moyen de contact utilisé à l'inscription.
                  emailContact: analyse.type === "email" ? analyse.valeur : null,
                  telephoneContact: analyse.type === "telephone" ? analyse.valeur : null,
                },
              },
            },
          })
          .catch((e: unknown) => {
            // Deux inscriptions simultanées : l'index unique tranche (R-17).
            if ((e as { code?: string }).code === "P2002") throw erreurs.conflit("Ce compte existe déjà. Connecte-toi.");
            throw e;
          });
        await journaliser(app.prisma, {
          acteurId: utilisateur.id,
          role: "CANDIDAT",
          action: "INSCRIPTION",
          cibleType: "utilisateur",
          cibleId: utilisateur.id,
          details: { consentementTraitement: true, consentementRecruteurs },
          ip: request.ip,
        });
        if (utilisateur.email) {
          const jeton = await creerJeton(app.prisma, "CONFIRMATION_EMAIL", utilisateur.id);
          await envoyerEmail(app.prisma, config, utilisateur.email, modeles.compteCree(lien(`/confirmer-email?jeton=${jeton}`), lien("/candidat")));
        }
        await app.ouvrirSession(reply, utilisateur);
        return reply.code(201).send({
          utilisateur: versPublic({ ...utilisateur, emailVerifieLe: null }),
        });
      },
    );

    app.post(
      "/auth/confirmer-email",
      {
        schema: {
          tags: ["Comptes"],
          summary: "Confirmer l'adresse e-mail avec le lien reçu",
          body: z.object({ jeton: z.string().min(10).max(200) }),
          response: { 200: z.object({ message: z.string() }) },
        },
      },
      async (request) => {
        const utilisateurId = await consommerJeton(app.prisma, "CONFIRMATION_EMAIL", request.body.jeton);
        if (!utilisateurId) {
          throw erreurs.invalide("Ce lien n'est plus valable. Connecte-toi et demande un nouveau lien de confirmation.");
        }
        await app.prisma.utilisateur.update({ where: { id: utilisateurId }, data: { emailVerifieLe: new Date() } });
        await journaliser(app.prisma, { acteurId: utilisateurId, role: "CANDIDAT", action: "EMAIL_CONFIRME", cibleType: "utilisateur", cibleId: utilisateurId });
        return { message: "Ton adresse e-mail est confirmée. Merci !" };
      },
    );

    app.post(
      "/auth/renvoyer-confirmation",
      {
        onRequest: exigerRole("CANDIDAT"),
        config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
        schema: { tags: ["Comptes"], summary: "Recevoir un nouveau lien de confirmation", response: { 200: z.object({ message: z.string() }) } },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        if (!moi.email) throw erreurs.invalide("Ton compte n'a pas d'adresse e-mail.");
        if (moi.emailVerifieLe) return { message: "Ton adresse e-mail est déjà confirmée." };
        const jeton = await creerJeton(app.prisma, "CONFIRMATION_EMAIL", moi.id);
        await envoyerEmail(app.prisma, config, moi.email, modeles.confirmationEmail(lien(`/confirmer-email?jeton=${jeton}`)));
        return { message: `Un nouveau lien a été envoyé à ${moi.email}.` };
      },
    );

    app.post(
      "/auth/mot-de-passe-oublie",
      {
        config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
        schema: {
          tags: ["Comptes"],
          summary: "Demander un lien pour changer de mot de passe",
          body: z.object({ identifiant: z.string().trim().min(1, "Saisis ton e-mail ou ton numéro de téléphone.") }),
          response: { 200: z.object({ message: z.string(), telephoneCabinet: z.string().nullable() }) },
        },
      },
      async (request) => {
        const analyse = analyserIdentifiant(request.body.identifiant);
        const { telephoneCabinet } = await lireReglages(app.prisma);
        if (analyse?.type === "telephone") {
          // Pas d'e-mail : seul le cabinet peut réinitialiser le mot de passe (M1).
          return {
            message: "Pour un compte créé avec un numéro de téléphone, contacte le cabinet : il réinitialisera ton mot de passe.",
            telephoneCabinet,
          };
        }
        if (analyse?.type === "email") {
          const u = await app.prisma.utilisateur.findUnique({ where: { email: analyse.valeur } });
          if (u && u.etat === "ACTIF") {
            const jeton = await creerJeton(app.prisma, "REINITIALISATION", u.id);
            await envoyerEmail(app.prisma, config, u.email!, modeles.motDePasseOublie(lien(`/reinitialiser?jeton=${jeton}`)));
            await journaliser(app.prisma, { acteurId: u.id, role: u.role, action: "REINITIALISATION_DEMANDEE", cibleType: "utilisateur", cibleId: u.id, ip: request.ip });
          }
        }
        // Même réponse que le compte existe ou non.
        return {
          message: "Si un compte existe avec cette adresse, tu vas recevoir un e-mail avec un lien (valable 1 heure). Pense à regarder dans les spams.",
          telephoneCabinet,
        };
      },
    );

    app.post(
      "/auth/reinitialiser",
      {
        config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
        schema: {
          tags: ["Comptes"],
          summary: "Choisir un nouveau mot de passe avec le lien reçu",
          body: z.object({ jeton: z.string().min(10).max(200), motDePasse: schemaMotDePasse }),
          response: { 200: z.object({ message: z.string() }) },
        },
      },
      async (request) => {
        const utilisateurId = await consommerJeton(app.prisma, "REINITIALISATION", request.body.jeton);
        if (!utilisateurId) {
          throw new ErreurMetier(400, CODES_ERREUR.DONNEES_INVALIDES, "Ce lien n'est plus valable. Fais une nouvelle demande.");
        }
        await app.prisma.$transaction([
          app.prisma.utilisateur.update({
            where: { id: utilisateurId },
            // Le lien reçu par e-mail prouve aussi que l'adresse est la bonne.
            data: { motDePasseHash: await hacherMotDePasse(request.body.motDePasse), tentativesEchouees: 0, bloqueJusquA: null, emailVerifieLe: new Date() },
          }),
          // Toutes les sessions ouvertes sont fermées.
          app.prisma.session.deleteMany({ where: { utilisateurId } }),
        ]);
        await journaliser(app.prisma, { acteurId: utilisateurId, action: "MOT_DE_PASSE_REINITIALISE", cibleType: "utilisateur", cibleId: utilisateurId, ip: request.ip });
        return { message: "Ton mot de passe est changé. Tu peux te connecter." };
      },
    );
  };
}
