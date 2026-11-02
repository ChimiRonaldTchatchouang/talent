import { randomBytes } from "node:crypto";
import { GRADES, STATUTS_LIGNE_SELECTION } from "@bdt/shared";
import { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerEmail, modeles } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { hacherMotDePasse } from "../lib/mots-de-passe.js";
import { accesOuvert, perimetre } from "../lib/recruteurs.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const versDate = (v: string) => new Date(`${v}T00:00:00Z`);
const aujourdHui = () => new Date().toISOString().slice(0, 10);
const schemaPerimetre = z.object({
  gradesVisibles: z.array(z.enum(GRADES)).min(1, "Choisissez au moins un grade visible."),
  domainesVisibles: z.array(z.string().uuid()).default([]),
});

function motDePasseProvisoire(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
}

/** Accès des recruteurs et sélections reçues, côté cabinet (M9, W8). */
export function routesRecruteursAdmin(config: Config): FastifyPluginAsyncZod {
  const site = config.URL_SITE.replace(/\/+$/, "");
  const emailIdentifiants = (nom: string, email: string, motDePasse: string, dateFin: Date, nouveau = false) =>
    modeles.identifiantsRecruteur({ nom, email, motDePasse, dateFin, lien: `${site}/connexion`, nouveau });

  return async (app) => {
    const admin = exigerRole("ADMIN");
    const id = z.object({ id: z.string().uuid("Identifiant invalide.") });

    const formater = async (a: Prisma.AccesRecruteurGetPayload<{ include: { utilisateur: true } }>) => ({
      id: a.id,
      nom: a.utilisateur.nom,
      email: a.utilisateur.email,
      etat: a.utilisateur.etat,
      entreprise: a.entreprise,
      pays: a.pays,
      gradesVisibles: a.gradesVisibles,
      domainesVisibles: a.domainesVisibles,
      dateFin: a.dateFin.toISOString().slice(0, 10),
      ouvert: accesOuvert(a) && a.utilisateur.etat === "ACTIF",
      profilsVisibles: await app.prisma.dossier.count({ where: perimetre(a, a.utilisateur.estDemo) }),
      derniereConnexion: a.utilisateur.derniereConnexion,
      creeLe: a.creeLe,
    });

    app.get(
      "/admin/recruteurs",
      { onRequest: admin, schema: { tags: ["Recruteurs"], summary: "Accès recruteurs" } },
      async () => {
        const acces = await app.prisma.accesRecruteur.findMany({ include: { utilisateur: true }, orderBy: { creeLe: "desc" } });
        return { recruteurs: await Promise.all(acces.map(formater)) };
      },
    );

    app.post(
      "/admin/recruteurs/apercu",
      {
        onRequest: admin,
        schema: { tags: ["Recruteurs"], summary: "Nombre de profils que verra un recruteur avec ce périmètre", body: schemaPerimetre },
      },
      async (request) => ({ nombre: await app.prisma.dossier.count({ where: perimetre(request.body) }) }),
    );

    app.post(
      "/admin/recruteurs",
      {
        onRequest: admin,
        schema: {
          tags: ["Recruteurs"],
          summary: "Créer un accès recruteur : identifiants envoyés par e-mail, date de fin obligatoire",
          body: schemaPerimetre.extend({
            nom: z.string().trim().min(2, "Indiquez le nom du recruteur.").max(120),
            entreprise: z.string().trim().min(2, "Indiquez l'entreprise.").max(160),
            pays: z.string().trim().min(2, "Indiquez le pays.").max(80),
            email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
            dateFin: date,
          }),
        },
      },
      async (request, reply) => {
        const acteur = utilisateurDe(request);
        const b = request.body;
        if (b.dateFin < aujourdHui()) throw erreurs.invalide("La date de fin doit être aujourd'hui ou plus tard.", { dateFin: "Date passée." });
        const motDePasse = motDePasseProvisoire();
        const cree = await app.prisma.accesRecruteur
          .create({
            data: {
              entreprise: b.entreprise,
              pays: b.pays,
              gradesVisibles: b.gradesVisibles,
              domainesVisibles: b.domainesVisibles,
              dateFin: versDate(b.dateFin),
              creeParId: acteur.id,
              utilisateur: {
                create: { role: "RECRUTEUR", nom: b.nom, email: b.email, motDePasseHash: await hacherMotDePasse(motDePasse), creeParId: acteur.id },
              },
            },
            include: { utilisateur: true },
          })
          .catch((e: unknown) => {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw erreurs.conflit("Cette adresse e-mail a déjà un compte.");
            throw e;
          });
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: "ADMIN",
          action: "ACCES_RECRUTEUR_CREE",
          cibleType: "acces_recruteur",
          cibleId: cree.id,
          details: { entreprise: b.entreprise, grades: b.gradesVisibles, domaines: b.domainesVisibles, dateFin: b.dateFin },
          ip: request.ip,
        });
        await envoyerEmail(app.prisma, config, b.email, emailIdentifiants(b.nom, b.email, motDePasse, cree.dateFin));
        return reply.code(201).send({ recruteur: await formater(cree), motDePasse });
      },
    );

    app.patch(
      "/admin/recruteurs/:id",
      {
        onRequest: admin,
        schema: {
          tags: ["Recruteurs"],
          summary: "Modifier un accès : périmètre, date de fin, désactivation",
          params: id,
          body: z.object({
            gradesVisibles: z.array(z.enum(GRADES)).min(1, "Choisissez au moins un grade visible.").optional(),
            domainesVisibles: z.array(z.string().uuid()).optional(),
            dateFin: date.optional(),
            etat: z.enum(["ACTIF", "DESACTIVE"]).optional(),
          }),
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const a = await app.prisma.accesRecruteur.findUnique({ where: { id: request.params.id } });
        if (!a) throw erreurs.introuvable("Cet accès");
        const { etat, dateFin, ...perim } = request.body;
        const maj = await app.prisma.accesRecruteur.update({
          where: { id: a.id },
          data: {
            ...perim,
            ...(dateFin ? { dateFin: versDate(dateFin), alerteFinEnvoyee: false } : {}),
            ...(etat ? { utilisateur: { update: { etat } } } : {}),
          },
          include: { utilisateur: true },
        });
        if (etat === "DESACTIVE") await app.prisma.session.deleteMany({ where: { utilisateurId: a.utilisateurId } });
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "ACCES_RECRUTEUR_MODIFIE", cibleType: "acces_recruteur", cibleId: a.id, details: request.body, ip: request.ip });
        return { recruteur: await formater(maj) };
      },
    );

    app.post(
      "/admin/recruteurs/:id/mot-de-passe",
      { onRequest: admin, schema: { tags: ["Recruteurs"], summary: "Nouveau mot de passe provisoire, renvoyé par e-mail", params: id } },
      async (request) => {
        const acteur = utilisateurDe(request);
        const a = await app.prisma.accesRecruteur.findUnique({ where: { id: request.params.id }, include: { utilisateur: true } });
        if (!a) throw erreurs.introuvable("Cet accès");
        const motDePasse = motDePasseProvisoire();
        await app.prisma.utilisateur.update({ where: { id: a.utilisateurId }, data: { motDePasseHash: await hacherMotDePasse(motDePasse), tentativesEchouees: 0, bloqueJusquA: null } });
        await app.prisma.session.deleteMany({ where: { utilisateurId: a.utilisateurId } });
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "MOT_DE_PASSE_RECRUTEUR_REINITIALISE", cibleType: "acces_recruteur", cibleId: a.id, ip: request.ip });
        await envoyerEmail(app.prisma, config, a.utilisateur.email!, emailIdentifiants(a.utilisateur.nom ?? "", a.utilisateur.email!, motDePasse, a.dateFin, true));
        return { motDePasse };
      },
    );

    app.get(
      "/admin/selections",
      {
        onRequest: admin,
        schema: {
          tags: ["Recruteurs"],
          summary: "Sélections reçues des recruteurs (dernière version de chacune, avec l'historique)",
          querystring: z.object({ historique: z.enum(["true", "false"]).optional() }),
        },
      },
      async (request) => {
        const envois = await app.prisma.selectionEnvoyee.findMany({
          where: request.query.historique === "true" ? {} : { remplaceeLe: null },
          orderBy: { envoyeeLe: "desc" },
          take: 200,
          include: {
            acces: { include: { utilisateur: { select: { nom: true, email: true } } } },
            lignes: { include: { dossier: { select: { id: true, prenoms: true, nom: true, telephoneContact: true, metier: true, grade: { select: { grade: true } } } } } },
          },
        });
        return {
          selections: envois.map((e) => ({
            id: e.id,
            recruteur: e.acces.utilisateur.nom,
            email: e.acces.utilisateur.email,
            entreprise: e.acces.entreprise,
            pays: e.acces.pays,
            message: e.message,
            envoyeeLe: e.envoyeeLe,
            remplaceeLe: e.remplaceeLe,
            lignes: e.lignes.map((l) => ({
              id: l.id,
              dossierId: l.dossier.id,
              candidat: [l.dossier.prenoms, l.dossier.nom].filter(Boolean).join(" "),
              telephone: l.dossier.telephoneContact,
              metier: l.dossier.metier,
              grade: l.dossier.grade?.grade ?? null,
              commentaire: l.commentaire,
              statut: l.statut,
            })),
          })),
        };
      },
    );

    app.put(
      "/admin/selections/lignes/:id",
      {
        onRequest: admin,
        schema: {
          tags: ["Recruteurs"],
          summary: "Suivi d'un candidat retenu : à contacter, mis en relation, retenu, non retenu",
          params: id,
          body: z.object({ statut: z.enum(STATUTS_LIGNE_SELECTION) }),
        },
      },
      async (request) => {
        const ligne = await app.prisma.selectionEnvoyeeLigne.findUnique({ where: { id: request.params.id } });
        if (!ligne) throw erreurs.introuvable("Cette ligne");
        await app.prisma.selectionEnvoyeeLigne.update({ where: { id: ligne.id }, data: { statut: request.body.statut } });
        await journaliser(app.prisma, {
          acteurId: utilisateurDe(request).id,
          role: "ADMIN",
          action: "SELECTION_STATUT_MODIFIE",
          cibleType: "dossier",
          cibleId: ligne.dossierId,
          details: { avant: ligne.statut, apres: request.body.statut },
        });
        return { statut: request.body.statut };
      },
    );
  };
}
