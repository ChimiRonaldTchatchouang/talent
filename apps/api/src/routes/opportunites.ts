import { gradeSuffisant, LIBELLES_GRADES, lienWhatsApp, normaliserTelephone, RANG_GRADE, schemaOffre, type Grade, type GradeOffre } from "@bdt/shared";
import type { Offre, PrismaClient } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { envoyerAuxAdmins, modeles } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { notifier, notifierPlusieurs } from "../lib/notifications.js";
import { parametresEnVigueur } from "../lib/parametres.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const params = z.object({ id: z.string().uuid("Identifiant invalide.") });
const versDate = (v: string | null) => (v ? new Date(`${v}T00:00:00Z`) : null);
const aujourdhui = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

/** Offres visibles des candidats : publiées, et dont la date limite n'est pas passée. */
const filtreOffresOuvertes = () => ({ publiee: true, OR: [{ dateLimite: null }, { dateLimite: { gte: aujourdhui() } }] });

export type RaisonBlocage = "DOSSIER_NON_ENVOYE" | "GRADE_NON_CONFIRME" | "GRADE_INSUFFISANT";

/** Situation d'un candidat face aux offres : son grade, et ce qui l'empêche éventuellement d'en ouvrir. */
async function situationCandidat(db: PrismaClient, utilisateurId: string) {
  const dossier = await db.dossier.findUnique({ where: { utilisateurId }, select: { id: true, statut: true, prenoms: true, nom: true, grade: { select: { grade: true, etat: true } } } });
  if (!dossier) throw erreurs.introuvable("Ton dossier");
  const { valeurs } = await parametresEnVigueur(db);
  const grade = (dossier.grade?.grade ?? null) as Grade | null;
  const confirme = dossier.grade?.etat === "CONFIRME" || dossier.grade?.etat === "CORRIGE";
  // Grade qui compte pour ouvrir une offre (null : aucun).
  const gradeRetenu = dossier.statut !== "ENVOYE" ? null : valeurs.opportunitesGradeConfirmeRequis && !confirme ? null : grade;
  const blocage = (requis: GradeOffre): RaisonBlocage | null => {
    if (dossier.statut !== "ENVOYE") return "DOSSIER_NON_ENVOYE";
    if (valeurs.opportunitesGradeConfirmeRequis && !confirme && gradeSuffisant(grade, requis)) return "GRADE_NON_CONFIRME";
    return gradeSuffisant(gradeRetenu, requis) ? null : "GRADE_INSUFFISANT";
  };
  return { dossier, grade, etatGrade: dossier.grade?.etat ?? null, gradeConfirmeRequis: valeurs.opportunitesGradeConfirmeRequis, blocage };
}

/** Partie d'une offre visible de tous les candidats (sans la description). */
const resume = (o: Offre) => ({
  id: o.id,
  titre: o.titre,
  pays: o.pays,
  ville: o.ville,
  domaine: o.domaine,
  typeContrat: o.typeContrat,
  gradeRequis: o.gradeRequis as GradeOffre,
  dateLimite: o.dateLimite,
  creeLe: o.creeLe,
});

/** Candidats dont le grade permet d'ouvrir l'offre (pour les prévenir de sa publication). */
async function candidatsEligibles(db: PrismaClient, requis: GradeOffre): Promise<string[]> {
  const { valeurs } = await parametresEnVigueur(db);
  const grades = (Object.keys(RANG_GRADE) as Grade[]).filter((g) => gradeSuffisant(g, requis));
  const dossiers = await db.dossier.findMany({
    where: {
      statut: "ENVOYE",
      grade: { grade: { in: grades }, ...(valeurs.opportunitesGradeConfirmeRequis ? { etat: { in: ["CONFIRME", "CORRIGE"] } } : {}) },
      utilisateur: { etat: "ACTIF" },
    },
    select: { utilisateurId: true },
  });
  return dossiers.map((d) => d.utilisateurId);
}

async function prevenirPublication(db: PrismaClient, offre: Offre) {
  const ids = await candidatsEligibles(db, offre.gradeRequis as GradeOffre);
  await notifierPlusieurs(db, ids, {
    type: "NOUVELLE_OFFRE",
    titre: "Nouvelle opportunité pour ton profil",
    texte: `${offre.titre} (${offre.pays})`,
    lien: `/candidat/opportunites/${offre.id}`,
    donnees: { titre: offre.titre, pays: offre.pays },
  });
  return ids.length;
}

export function routesOpportunites(config: Config): FastifyPluginAsyncZod {
  return async (app) => {
    const admin = exigerRole("ADMIN");
    const candidat = exigerRole("CANDIDAT");
    const site = () => config.URL_SITE.replace(/\/+$/, "");

    // ---------- Cabinet : publication des offres ----------

    app.get("/admin/offres", { onRequest: admin, schema: { tags: ["Opportunités"], summary: "Toutes les offres, avec le nombre de candidats intéressés" } }, async () => {
      const offres = await app.prisma.offre.findMany({ orderBy: { creeLe: "desc" }, include: { _count: { select: { interets: true } } } });
      return offres.map((o) => ({ ...resume(o), description: o.description, publiee: o.publiee, interesses: o._count.interets, modifieLe: o.modifieLe }));
    });

    app.post("/admin/offres", { onRequest: admin, schema: { tags: ["Opportunités"], summary: "Publier une offre", body: schemaOffre } }, async (request, reply) => {
      const moi = utilisateurDe(request);
      const b = request.body;
      const offre = await app.prisma.offre.create({ data: { ...b, dateLimite: versDate(b.dateLimite), creeParId: moi.id } });
      const prevenus = offre.publiee ? await prevenirPublication(app.prisma, offre) : 0;
      await journaliser(app.prisma, { acteurId: moi.id, role: "ADMIN", action: "OFFRE_CREEE", cibleType: "offre", cibleId: offre.id, details: { titre: offre.titre, gradeRequis: offre.gradeRequis, publiee: offre.publiee, prevenus }, ip: request.ip });
      return reply.code(201).send({ ...resume(offre), description: offre.description, publiee: offre.publiee, interesses: 0, prevenus });
    });

    app.put("/admin/offres/:id", { onRequest: admin, schema: { tags: ["Opportunités"], summary: "Modifier, publier ou retirer une offre", params, body: schemaOffre } }, async (request) => {
      const moi = utilisateurDe(request);
      const avant = await app.prisma.offre.findUnique({ where: { id: request.params.id } });
      if (!avant) throw erreurs.introuvable("Cette offre");
      const b = request.body;
      const offre = await app.prisma.offre.update({ where: { id: avant.id }, data: { ...b, dateLimite: versDate(b.dateLimite) } });
      const prevenus = !avant.publiee && offre.publiee ? await prevenirPublication(app.prisma, offre) : 0;
      await journaliser(app.prisma, { acteurId: moi.id, role: "ADMIN", action: "OFFRE_MODIFIEE", cibleType: "offre", cibleId: offre.id, details: { titre: offre.titre, gradeRequis: offre.gradeRequis, publiee: offre.publiee, prevenus }, ip: request.ip });
      return { ...resume(offre), description: offre.description, publiee: offre.publiee, prevenus };
    });

    app.delete("/admin/offres/:id", { onRequest: admin, schema: { tags: ["Opportunités"], summary: "Supprimer une offre", params } }, async (request, reply) => {
      const moi = utilisateurDe(request);
      const offre = await app.prisma.offre.findUnique({ where: { id: request.params.id } });
      if (!offre) throw erreurs.introuvable("Cette offre");
      await app.prisma.offre.delete({ where: { id: offre.id } });
      await journaliser(app.prisma, { acteurId: moi.id, role: "ADMIN", action: "OFFRE_SUPPRIMEE", cibleType: "offre", cibleId: offre.id, details: { titre: offre.titre }, ip: request.ip });
      return reply.code(204).send();
    });

    app.get("/admin/offres/:id/interesses", { onRequest: admin, schema: { tags: ["Opportunités"], summary: "Candidats intéressés par une offre", params } }, async (request) => {
      const interets = await app.prisma.interetOffre.findMany({
        where: { offreId: request.params.id },
        orderBy: { creeLe: "desc" },
        include: { dossier: { select: { id: true, prenoms: true, nom: true, telephoneContact: true, metier: true, grade: { select: { grade: true, etat: true } }, utilisateur: { select: { telephone: true } } } } },
      });
      return interets.map((i) => ({
        dossierId: i.dossier.id,
        nom: [i.dossier.prenoms, i.dossier.nom].filter(Boolean).join(" ") || "Candidat",
        metier: i.dossier.metier,
        telephone: i.dossier.telephoneContact ?? i.dossier.utilisateur.telephone,
        grade: i.dossier.grade?.grade ?? null,
        etatGrade: i.dossier.grade?.etat ?? null,
        le: i.creeLe,
      }));
    });

    // ---------- Cabinet : message WhatsApp ----------

    app.post(
      "/admin/dossiers/:id/whatsapp",
      {
        onRequest: admin,
        schema: {
          tags: ["Opportunités"],
          summary: "Préparer un message WhatsApp pour le candidat (lien wa.me) et l'inscrire au journal",
          params,
          body: z.object({ message: z.string().trim().min(1, "Écrivez le message.").max(2000, "Le message est trop long (2 000 caractères maximum).") }),
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const d = await app.prisma.dossier.findUnique({ where: { id: request.params.id }, select: { id: true, telephoneContact: true, utilisateur: { select: { telephone: true } } } });
        if (!d) throw erreurs.introuvable("Ce dossier");
        const saisi = d.telephoneContact ?? d.utilisateur.telephone;
        // Numéro saisi sans indicatif (ex. 699001122) : +237 est ajouté, comme à la connexion.
        const telephone = saisi ? (normaliserTelephone(saisi) ?? saisi) : null;
        if (!telephone) throw erreurs.conflit("Ce candidat n'a pas renseigné de numéro de téléphone.");
        const lien = lienWhatsApp(telephone, request.body.message);
        if (!lien) throw erreurs.conflit("Le numéro de téléphone de ce candidat n'est pas exploitable.");
        await journaliser(app.prisma, { acteurId: moi.id, role: "ADMIN", action: "WHATSAPP_PREPARE", cibleType: "dossier", cibleId: d.id, details: { message: request.body.message }, ip: request.ip });
        return { lien, telephone };
      },
    );

    // ---------- Candidat : opportunités ----------

    app.get("/candidat/offres", { onRequest: candidat, schema: { tags: ["Opportunités"], summary: "Offres publiées, et celles que mon grade permet d'ouvrir" } }, async (request) => {
      const moi = utilisateurDe(request);
      const s = await situationCandidat(app.prisma, moi.id);
      const [offres, interets] = await Promise.all([
        app.prisma.offre.findMany({ where: filtreOffresOuvertes(), orderBy: { creeLe: "desc" } }),
        app.prisma.interetOffre.findMany({ where: { dossierId: s.dossier.id }, select: { offreId: true } }),
      ]);
      const deja = new Set(interets.map((i) => i.offreId));
      return {
        grade: s.grade,
        etatGrade: s.etatGrade,
        gradeConfirmeRequis: s.gradeConfirmeRequis,
        offres: offres.map((o) => {
          const blocage = s.blocage(o.gradeRequis as GradeOffre);
          return { ...resume(o), accessible: !blocage, blocage, interesse: deja.has(o.id) };
        }),
      };
    });

    app.get("/candidat/offres/:id", { onRequest: candidat, schema: { tags: ["Opportunités"], summary: "Ouvrir une offre (seulement avec le grade requis ou supérieur)", params } }, async (request) => {
      const moi = utilisateurDe(request);
      const offre = await app.prisma.offre.findFirst({ where: { id: request.params.id, ...filtreOffresOuvertes() } });
      if (!offre) throw erreurs.introuvable("Cette offre");
      const s = await situationCandidat(app.prisma, moi.id);
      const blocage = s.blocage(offre.gradeRequis as GradeOffre);
      if (blocage) {
        // Le candidat est prévenu dans ses notifications (une fois par jour et par offre au plus).
        const recente = await app.prisma.notification.findFirst({
          where: { utilisateurId: moi.id, type: "OFFRE_VERROUILLEE", lien: `/candidat/opportunites/${offre.id}`, creeLe: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
        });
        if (!recente) {
          const requis = offre.gradeRequis as GradeOffre;
          const texte = {
            DOSSIER_NON_ENVOYE: "Termine et envoie ton dossier pour accéder aux opportunités.",
            GRADE_NON_CONFIRME: "Ton grade doit d'abord être confirmé par le cabinet pour ouvrir cette offre.",
            GRADE_INSUFFISANT: `Passe au grade ${requis} (${LIBELLES_GRADES[requis].libelle.toLowerCase()}) pour consulter cette offre. Les services du cabinet t'y aident.`,
          }[blocage];
          await notifier(app.prisma, moi.id, {
            type: "OFFRE_VERROUILLEE",
            titre: `Offre réservée au grade ${requis}${requis === "A" ? "" : " ou plus"}`,
            texte,
            lien: `/candidat/opportunites/${offre.id}`,
            donnees: { titre: offre.titre, gradeRequis: requis, blocage },
          });
        }
        return { ...resume(offre), accessible: false, blocage, grade: s.grade, description: null, interesse: false };
      }
      const interet = await app.prisma.interetOffre.findUnique({ where: { offreId_dossierId: { offreId: offre.id, dossierId: s.dossier.id } } });
      return { ...resume(offre), accessible: true, blocage: null, grade: s.grade, description: offre.description, interesse: !!interet };
    });

    app.post("/candidat/offres/:id/interet", { onRequest: candidat, schema: { tags: ["Opportunités"], summary: "« Je suis intéressé(e) » par une offre", params } }, async (request) => {
      const moi = utilisateurDe(request);
      const offre = await app.prisma.offre.findFirst({ where: { id: request.params.id, ...filtreOffresOuvertes() } });
      if (!offre) throw erreurs.introuvable("Cette offre");
      const s = await situationCandidat(app.prisma, moi.id);
      if (s.blocage(offre.gradeRequis as GradeOffre)) throw erreurs.accesRefuse();
      const deja = await app.prisma.interetOffre.findUnique({ where: { offreId_dossierId: { offreId: offre.id, dossierId: s.dossier.id } } });
      if (!deja) {
        await app.prisma.interetOffre.create({ data: { offreId: offre.id, dossierId: s.dossier.id } });
        await journaliser(app.prisma, { acteurId: moi.id, role: "CANDIDAT", action: "OFFRE_INTERESSE", cibleType: "offre", cibleId: offre.id, details: { dossierId: s.dossier.id } });
        const nom = [s.dossier.prenoms, s.dossier.nom].filter(Boolean).join(" ") || "Un candidat";
        await envoyerAuxAdmins(app.prisma, config, modeles.interetOffre({ nom, offre: offre.titre, pays: offre.pays, grade: s.grade, lien: `${site()}/admin/opportunites` }));
      }
      return { interesse: true };
    });

    // ---------- Candidat : notifications ----------

    app.get("/candidat/notifications", { onRequest: candidat, schema: { tags: ["Notifications"], summary: "Mes notifications (les 50 plus récentes)" } }, async (request) => {
      const moi = utilisateurDe(request);
      const [notifications, nonLues] = await Promise.all([
        app.prisma.notification.findMany({ where: { utilisateurId: moi.id }, orderBy: { creeLe: "desc" }, take: 50 }),
        app.prisma.notification.count({ where: { utilisateurId: moi.id, lueLe: null } }),
      ]);
      return {
        nonLues,
        notifications: notifications.map((n) => ({ id: n.id, type: n.type, titre: n.titre, texte: n.texte, lien: n.lien, donnees: n.donnees, lue: !!n.lueLe, creeLe: n.creeLe })),
      };
    });

    app.post("/candidat/notifications/lues", { onRequest: candidat, schema: { tags: ["Notifications"], summary: "Marquer toutes mes notifications comme lues" } }, async (request, reply) => {
      const moi = utilisateurDe(request);
      await app.prisma.notification.updateMany({ where: { utilisateurId: moi.id, lueLe: null }, data: { lueLe: new Date() } });
      return reply.code(204).send();
    });
  };
}
