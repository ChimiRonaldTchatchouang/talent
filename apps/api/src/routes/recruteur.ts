import { GRADES, TRANCHES_EXPERIENCE } from "@bdt/shared";
import type { AccesRecruteur, Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerAuxAdmins } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { inclusionProfil, perimetre, profilAnonyme } from "../lib/recruteurs.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const oui = z.enum(["true", "false"]).optional().transform((v) => v === "true");
const aujourdHui = () => new Date(new Date().toISOString().slice(0, 10));

/**
 * Espace du recruteur invité (M9, W8). Toutes les réponses passent par profilAnonyme :
 * jamais de coordonnées ni de pièces (R-15). Le périmètre est vérifié sur chaque lecture (R-14).
 */
export function routesRecruteur(config: Config): FastifyPluginAsyncZod {
  return async (app) => {
    const recruteur = exigerRole("RECRUTEUR");

    const accesDe = async (request: FastifyRequest): Promise<AccesRecruteur> => {
      const acces = await app.prisma.accesRecruteur.findUnique({ where: { utilisateurId: utilisateurDe(request).id } });
      if (!acces) throw erreurs.accesRefuse();
      return acces;
    };

    /** Sélection en cours ; les profils sortis du périmètre en sont retirés (W8). */
    const selectionDe = async (acces: AccesRecruteur) => {
      const selection = await app.prisma.selection.upsert({ where: { accesId: acces.id }, create: { accesId: acces.id }, update: {}, include: { lignes: true } });
      const visibles = await app.prisma.dossier.findMany({
        where: { AND: [perimetre(acces), { id: { in: selection.lignes.map((l) => l.dossierId) } }] },
        include: inclusionProfil,
      });
      const sortis = selection.lignes.filter((l) => !visibles.some((v) => v.id === l.dossierId));
      if (sortis.length) {
        await app.prisma.selectionLigne.deleteMany({ where: { selectionId: selection.id, dossierId: { in: sortis.map((l) => l.dossierId) } } });
      }
      const dernierEnvoi = await app.prisma.selectionEnvoyee.findFirst({ where: { accesId: acces.id, remplaceeLe: null }, orderBy: { envoyeeLe: "desc" } });
      return {
        message: selection.message,
        lignes: selection.lignes
          .filter((l) => visibles.some((v) => v.id === l.dossierId))
          .sort((a, b) => a.ajouteLe.getTime() - b.ajouteLe.getTime())
          .map((l) => ({ profil: profilAnonyme(visibles.find((v) => v.id === l.dossierId)!), commentaire: l.commentaire })),
        retires: sortis.length
          ? `${sortis.length} profil${sortis.length > 1 ? "s ont été retirés" : " a été retiré"} de votre sélection : ${sortis.length > 1 ? "ils ne sont" : "il n'est"} plus disponible${sortis.length > 1 ? "s" : ""}.`
          : null,
        dernierEnvoi: dernierEnvoi?.envoyeeLe ?? null,
      };
    };

    const profilVisible = async (request: FastifyRequest, acces: AccesRecruteur, id: string) => {
      const d = await app.prisma.dossier.findFirst({ where: { AND: [perimetre(acces), { id }] }, include: inclusionProfil });
      if (!d) {
        // Lien direct vers un profil hors périmètre : refusé et journalisé (W8).
        await journaliser(app.prisma, { acteurId: acces.utilisateurId, role: "RECRUTEUR", action: "ACCES_HORS_PERIMETRE", cibleType: "dossier", cibleId: id, ip: request.ip });
        throw erreurs.introuvable("Ce profil (ou il n'est pas dans votre périmètre)");
      }
      return d;
    };

    app.get(
      "/recruteur/moi",
      { onRequest: recruteur, schema: { tags: ["Recruteur"], summary: "Mon accès : entreprise, périmètre, date de fin" } },
      async (request) => {
        const acces = await accesDe(request);
        const domaines = await app.prisma.domaine.findMany({ where: { id: { in: acces.domainesVisibles } }, select: { id: true, nom: true } });
        return {
          entreprise: acces.entreprise,
          pays: acces.pays,
          dateFin: acces.dateFin.toISOString().slice(0, 10),
          gradesVisibles: acces.gradesVisibles,
          domaines: acces.domainesVisibles.length ? domaines : null,
        };
      },
    );

    app.get(
      "/recruteur/profils",
      {
        onRequest: recruteur,
        schema: {
          tags: ["Recruteur"],
          summary: "Profils anonymisés de mon périmètre, avec filtres",
          querystring: z.object({
            grades: z.string().optional().transform((v) => (v ? v.split(",") : [])).pipe(z.array(z.enum(GRADES))),
            domaineId: z.string().uuid().optional(),
            tranches: z.string().optional().transform((v) => (v ? v.split(",") : [])).pipe(z.array(z.enum(TRANCHES_EXPERIENCE))),
            langue: z.string().trim().max(40).optional(),
            competence: z.string().trim().max(80).optional(),
            testVerifie: oui,
            diplomeVerifie: oui,
            passeportValide: oui,
          }),
        },
      },
      async (request) => {
        const acces = await accesDe(request);
        const f = request.query;
        const et: Prisma.DossierWhereInput[] = [perimetre(acces)];
        if (f.grades.length) et.push({ grade: { grade: { in: f.grades } } });
        if (f.domaineId) et.push({ aTravaille: true, domaineId: f.domaineId });
        if (f.tranches.length) et.push({ aTravaille: true, trancheExperience: { in: f.tranches } });
        if (f.langue) et.push({ languesParlees: { has: f.langue } });
        if (f.competence) et.push({ competences: { some: { competence: { statut: "VALIDEE", nom: { contains: f.competence, mode: "insensitive" } } } } });
        if (f.testVerifie) et.push({ grade: { elementsFaits: { has: "TEST_LANGUE" } } });
        if (f.diplomeVerifie) et.push({ aDiplome: true, pieces: { some: { type: "DIPLOME", etat: "VERIFIEE" } } });
        if (f.passeportValide) et.push({ aPasseport: true, passeportExpiration: { gte: aujourdHui() } });
        const dossiers = await app.prisma.dossier.findMany({ where: { AND: et }, include: inclusionProfil, orderBy: [{ grade: { grade: "asc" } }, { envoyeLe: "desc" }], take: 500 });
        const selection = await app.prisma.selection.findUnique({ where: { accesId: acces.id }, include: { lignes: { select: { dossierId: true } } } });
        const choisis = new Set(selection?.lignes.map((l) => l.dossierId));
        return { total: dossiers.length, profils: dossiers.map((d) => ({ ...profilAnonyme(d), dansSelection: choisis.has(d.id) })) };
      },
    );

    app.get(
      "/recruteur/profils/:id",
      { onRequest: recruteur, schema: { tags: ["Recruteur"], summary: "Fiche anonymisée (consultation journalisée)", params: z.object({ id: z.string().uuid("Profil introuvable.") }) } },
      async (request) => {
        const acces = await accesDe(request);
        const d = await profilVisible(request, acces, request.params.id);
        await app.prisma.consultationRecruteur.create({ data: { accesId: acces.id, dossierId: d.id } });
        await journaliser(app.prisma, { acteurId: acces.utilisateurId, role: "RECRUTEUR", action: "PROFIL_CONSULTE", cibleType: "dossier", cibleId: d.id, ip: request.ip });
        const ligne = await app.prisma.selectionLigne.findFirst({ where: { dossierId: d.id, selection: { accesId: acces.id } } });
        return { profil: profilAnonyme(d), dansSelection: !!ligne, commentaire: ligne?.commentaire ?? "" };
      },
    );

    app.get(
      "/recruteur/selection",
      { onRequest: recruteur, schema: { tags: ["Recruteur"], summary: "Ma sélection en cours" } },
      async (request) => selectionDe(await accesDe(request)),
    );

    app.put(
      "/recruteur/selection/profils/:id",
      {
        onRequest: recruteur,
        schema: {
          tags: ["Recruteur"],
          summary: "Ajouter un profil à ma sélection, ou modifier mon commentaire",
          params: z.object({ id: z.string().uuid() }),
          body: z.object({ commentaire: z.string().trim().max(1000, "1 000 caractères maximum.").default("") }),
        },
      },
      async (request) => {
        const acces = await accesDe(request);
        await profilVisible(request, acces, request.params.id);
        const selection = await app.prisma.selection.upsert({ where: { accesId: acces.id }, create: { accesId: acces.id }, update: {} });
        await app.prisma.selectionLigne.upsert({
          where: { selectionId_dossierId: { selectionId: selection.id, dossierId: request.params.id } },
          create: { selectionId: selection.id, dossierId: request.params.id, commentaire: request.body.commentaire },
          update: { commentaire: request.body.commentaire },
        });
        return selectionDe(acces);
      },
    );

    app.delete(
      "/recruteur/selection/profils/:id",
      { onRequest: recruteur, schema: { tags: ["Recruteur"], summary: "Retirer un profil de ma sélection", params: z.object({ id: z.string().uuid() }) } },
      async (request) => {
        const acces = await accesDe(request);
        await app.prisma.selectionLigne.deleteMany({ where: { dossierId: request.params.id, selection: { accesId: acces.id } } });
        return selectionDe(acces);
      },
    );

    app.put(
      "/recruteur/selection",
      {
        onRequest: recruteur,
        schema: { tags: ["Recruteur"], summary: "Message accompagnant ma sélection", body: z.object({ message: z.string().trim().max(3000, "3 000 caractères maximum.") }) },
      },
      async (request) => {
        const acces = await accesDe(request);
        await app.prisma.selection.upsert({ where: { accesId: acces.id }, create: { accesId: acces.id, message: request.body.message }, update: { message: request.body.message } });
        return selectionDe(acces);
      },
    );

    app.post(
      "/recruteur/selection/envoyer",
      { onRequest: recruteur, schema: { tags: ["Recruteur"], summary: "Envoyer ma sélection au cabinet (remplace l'envoi précédent)" } },
      async (request) => {
        const acces = await accesDe(request);
        const courante = await selectionDe(acces);
        if (courante.lignes.length === 0) throw erreurs.invalide("Votre sélection est vide : ajoutez au moins un profil.");
        const precedent = await app.prisma.selectionEnvoyee.findFirst({ where: { accesId: acces.id, remplaceeLe: null }, include: { lignes: true } });
        const envoi = await app.prisma.$transaction(async (tx) => {
          // W8 : un nouvel envoi remplace le précédent, qui reste dans l'historique.
          if (precedent) await tx.selectionEnvoyee.update({ where: { id: precedent.id }, data: { remplaceeLe: new Date() } });
          return tx.selectionEnvoyee.create({
            data: {
              accesId: acces.id,
              message: courante.message,
              lignes: {
                create: courante.lignes.map((l) => ({
                  dossierId: l.profil.id,
                  commentaire: l.commentaire,
                  // Le suivi déjà fait par le cabinet pour ce candidat est conservé.
                  statut: precedent?.lignes.find((x) => x.dossierId === l.profil.id)?.statut ?? "A_CONTACTER",
                })),
              },
            },
          });
        });
        await journaliser(app.prisma, {
          acteurId: acces.utilisateurId,
          role: "RECRUTEUR",
          action: "SELECTION_ENVOYEE",
          cibleType: "selection",
          cibleId: envoi.id,
          details: { profils: courante.lignes.length, remplace: precedent?.id ?? null },
          ip: request.ip,
        });
        const moi = utilisateurDe(request);
        await envoyerAuxAdmins(app.prisma, config, {
          sujet: `Sélection reçue : ${acces.entreprise}`,
          texte:
            `Bonjour,\n\n${moi.nom ?? "Un recruteur"} (${acces.entreprise}, ${acces.pays}) a envoyé une sélection de ${courante.lignes.length} profil(s)` +
            `${precedent ? ", qui remplace sa sélection précédente" : ""}.\n${config.URL_SITE.replace(/\/+$/, "")}/admin/selections`,
        });
        return { ...(await selectionDe(acces)), envoye: true };
      },
    );
  };
}
