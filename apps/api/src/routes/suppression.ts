import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerAuxAdmins, envoyerEmail } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { effacerCompte } from "../lib/suppression.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

/** Droit à la suppression (M11, W10) : le candidat demande, le cabinet valide, tout est effacé. */
export function routesSuppression(config: Config): FastifyPluginAsyncZod {
  const site = config.URL_SITE.replace(/\/+$/, "");
  return async (app) => {
    const candidat = exigerRole("CANDIDAT");
    const admin = exigerRole("ADMIN");
    const enAttente = (utilisateurId: string) => app.prisma.demandeSuppression.findFirst({ where: { utilisateurId, statut: "EN_ATTENTE" } });

    app.get(
      "/candidat/suppression",
      { onRequest: candidat, schema: { tags: ["Suppression"], summary: "Ma demande de suppression en cours, s'il y en a une" } },
      async (request) => {
        const d = await enAttente(utilisateurDe(request).id);
        return { demande: d ? { demandeLe: d.demandeLe } : null };
      },
    );

    app.post(
      "/candidat/suppression",
      {
        onRequest: candidat,
        schema: {
          tags: ["Suppression"],
          summary: "Demander la suppression de mon dossier",
          body: z.object({ confirmation: z.literal(true, { errorMap: () => ({ message: "Confirme ta demande en cochant la case." }) }) }),
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        if (await enAttente(moi.id)) throw erreurs.conflit("Ta demande est déjà enregistrée. Le cabinet va la traiter.");
        const demande = await app.prisma.demandeSuppression.create({ data: { utilisateurId: moi.id } });
        await journaliser(app.prisma, { acteurId: moi.id, role: "CANDIDAT", action: "SUPPRESSION_DEMANDEE", cibleType: "demande_suppression", cibleId: demande.id, ip: request.ip });
        await envoyerAuxAdmins(app.prisma, config, {
          sujet: "Demande de suppression d'un dossier",
          texte: `Bonjour,\n\nUn candidat demande la suppression de son dossier. Merci de la traiter :\n${site}/admin/suppressions`,
        });
        return { demande: { demandeLe: demande.demandeLe } };
      },
    );

    app.delete(
      "/candidat/suppression",
      { onRequest: candidat, schema: { tags: ["Suppression"], summary: "Annuler ma demande de suppression" } },
      async (request) => {
        const moi = utilisateurDe(request);
        const d = await enAttente(moi.id);
        if (d) {
          await app.prisma.demandeSuppression.update({ where: { id: d.id }, data: { statut: "ANNULEE", traiteLe: new Date() } });
          await journaliser(app.prisma, { acteurId: moi.id, role: "CANDIDAT", action: "SUPPRESSION_ANNULEE", cibleType: "demande_suppression", cibleId: d.id });
        }
        return { demande: null };
      },
    );

    app.get(
      "/admin/suppressions",
      { onRequest: admin, schema: { tags: ["Suppression"], summary: "Demandes de suppression en attente, et nombre de demandes traitées" } },
      async () => {
        const [demandes, traitees] = await Promise.all([
          app.prisma.demandeSuppression.findMany({ where: { statut: "EN_ATTENTE" }, orderBy: { demandeLe: "asc" } }),
          app.prisma.demandeSuppression.count({ where: { statut: "TRAITEE" } }),
        ]);
        const comptes = await app.prisma.utilisateur.findMany({
          where: { id: { in: demandes.map((d) => d.utilisateurId!).filter(Boolean) } },
          select: { id: true, email: true, telephone: true, dossier: { select: { id: true, prenoms: true, nom: true, statut: true } } },
        });
        return {
          traitees,
          demandes: demandes.map((d) => {
            const c = comptes.find((x) => x.id === d.utilisateurId);
            return {
              id: d.id,
              demandeLe: d.demandeLe,
              candidat: [c?.dossier?.prenoms, c?.dossier?.nom].filter(Boolean).join(" ") || c?.email || c?.telephone || "Compte",
              dossierId: c?.dossier?.id ?? null,
            };
          }),
        };
      },
    );

    app.post(
      "/admin/suppressions/:id/valider",
      {
        onRequest: admin,
        schema: { tags: ["Suppression"], summary: "Valider la demande : le dossier et les fichiers sont effacés définitivement", params: z.object({ id: z.string().uuid() }) },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const demande = await app.prisma.demandeSuppression.findUnique({ where: { id: request.params.id } });
        if (!demande || demande.statut !== "EN_ATTENTE" || !demande.utilisateurId) throw erreurs.conflit("Cette demande a déjà été traitée.");
        const compte = await app.prisma.utilisateur.findUnique({ where: { id: demande.utilisateurId }, include: { dossier: { select: { emailContact: true } } } });
        const email = compte?.email ?? compte?.dossier?.emailContact ?? null;
        await effacerCompte(app.prisma, demande.utilisateurId);
        // Trace anonyme : la demande ne garde plus que ses dates.
        await app.prisma.demandeSuppression.update({
          where: { id: demande.id },
          data: { statut: "TRAITEE", traiteLe: new Date(), traiteParId: acteur.id, utilisateurId: null },
        });
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "SUPPRESSION_EFFECTUEE", cibleType: "demande_suppression", cibleId: demande.id, ip: request.ip });
        if (email) {
          await envoyerEmail(app.prisma, config, {
            a: email,
            sujet: "Ton dossier a été supprimé",
            texte: "Bonjour,\n\nComme tu l'as demandé, ton dossier, tes documents et ton compte ont été supprimés de la plateforme.\n\n— Le cabinet",
          });
          // Cet e-mail de confirmation ne garde pas l'adresse dans le journal des e-mails.
          await app.prisma.emailEnvoye.updateMany({ where: { destinataire: email }, data: { destinataire: "[candidat supprimé]" } });
        }
        return { statut: "TRAITEE" };
      },
    );
  };
}
