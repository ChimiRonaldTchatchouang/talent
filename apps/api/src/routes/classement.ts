import { GRADES, NIVEAUX_EVALUES, type ElementComblable, type EtatService } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { confirmerGrade, corrigerGrade, libererGrade, recalculerGrade } from "../lib/classement.js";
import type { Config } from "../lib/config.js";
import { sommaire, inclusionDossier } from "../lib/dossier.js";
import { envoyerAuxAdmins } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

/** Ordre des états d'un service : l'administrateur ne fait qu'avancer (ou annuler). */
const ORDRE: EtatService[] = ["SUGGERE", "INTERESSE", "ACCEPTE", "EN_COURS", "REALISE"];
const DATE_ETAT = { INTERESSE: "interesseLe", ACCEPTE: "accepteLe", EN_COURS: "enCoursLe", REALISE: "realiseLe", ANNULE: "annuleLe" } as const;

/** Grade, explication et services d'un dossier (vue commune au candidat et au cabinet). */
export async function vueClassement(db: PrismaClient, config: Config, dossierId: string) {
  let grade = await db.gradeDossier.findUnique({ where: { dossierId } });
  if (!grade) {
    await recalculerGrade(db, config, dossierId, "ADMIN", "Premier calcul");
    grade = await db.gradeDossier.findUniqueOrThrow({ where: { dossierId } });
  }
  const [services, suivis, dossier] = await Promise.all([
    db.service.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.serviceCandidat.findMany({ where: { dossierId } }),
    db.dossier.findUniqueOrThrow({ where: { id: dossierId }, select: { niveauEvalue: true } }),
  ]);
  const suggeres = new Set(grade.suggestions as ElementComblable[]);
  return {
    grade: grade.grade,
    gradeCalcule: grade.gradeCalcule,
    etat: grade.etat,
    regle: grade.regle,
    raison: grade.raison,
    alerte: grade.alerte,
    calculeLe: grade.calculeLe,
    niveauEvalue: dossier.niveauEvalue,
    elements: grade.explication as unknown as { element: string; etat: string; acquis: boolean; bloquant: boolean; raison: string }[],
    services: services.map((s) => {
      const suivi = suivis.find((x) => x.serviceId === s.id);
      // Un service annulé redevient « suggéré » s'il comble toujours un manque (W4).
      const etat: EtatService = !suivi || suivi.etat === "ANNULE" ? "SUGGERE" : suivi.etat;
      return {
        id: s.id,
        nom: s.nom,
        description: s.description,
        duree: s.duree,
        elementComble: s.elementComble,
        suggere: s.elementComble !== null && suggeres.has(s.elementComble),
        etat,
        annuleAuparavant: suivi?.etat === "ANNULE",
      };
    }),
  };
}

const sClassement = z.any();

export function routesClassement(config: Config): FastifyPluginAsyncZod {
  return async (app) => {
    const candidat = exigerRole("CANDIDAT");
    const admin = exigerRole("ADMIN");

    const monDossier = async (utilisateurId: string) => {
      const d = await app.prisma.dossier.findUnique({ where: { utilisateurId }, include: inclusionDossier });
      if (!d) throw erreurs.introuvable("Ton dossier");
      return d;
    };
    const dossierExistant = async (id: string) => {
      const d = await app.prisma.dossier.findUnique({ where: { id } });
      if (!d) throw erreurs.introuvable("Ce dossier");
      return d;
    };

    app.get(
      "/candidat/classement",
      {
        onRequest: candidat,
        schema: { tags: ["Classement"], summary: "Mon grade, pourquoi ce grade, et les services proposés", response: { 200: sClassement } },
      },
      async (request) => {
        const d = await monDossier(utilisateurDe(request).id);
        // Le grade n'est montré qu'une fois les étapes du formulaire terminées : avant, il ne voudrait rien dire.
        return { disponible: sommaire(d).pretAEnvoyer, ...(await vueClassement(app.prisma, config, d.id)) };
      },
    );

    app.get(
      "/candidat/consultations",
      { onRequest: candidat, schema: { tags: ["Classement"], summary: "Combien de fois mon profil a été consulté par un recruteur (sans nom d'entreprise)" } },
      async (request) => {
        const d = await monDossier(utilisateurDe(request).id);
        const [nombre, derniere] = await Promise.all([
          app.prisma.consultationRecruteur.count({ where: { dossierId: d.id } }),
          app.prisma.consultationRecruteur.findFirst({ where: { dossierId: d.id }, orderBy: { id: "desc" }, select: { creeLe: true } }),
        ]);
        return { nombre, derniere: derniere?.creeLe ?? null };
      },
    );

    app.post(
      "/candidat/services/:serviceId/interet",
      {
        onRequest: candidat,
        schema: { tags: ["Classement"], summary: "« Je suis intéressé » par un service du cabinet", params: z.object({ serviceId: z.string().uuid() }) },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const d = await monDossier(moi.id);
        const service = await app.prisma.service.findFirst({ where: { id: request.params.serviceId, actif: true } });
        if (!service) throw erreurs.introuvable("Ce service");
        const suivi = await app.prisma.serviceCandidat.findUnique({ where: { dossierId_serviceId: { dossierId: d.id, serviceId: service.id } } });
        const vue = async () => ({ disponible: sommaire(d).pretAEnvoyer, ...(await vueClassement(app.prisma, config, d.id)) });
        if (suivi && suivi.etat !== "ANNULE") return vue();
        await app.prisma.serviceCandidat.upsert({
          where: { dossierId_serviceId: { dossierId: d.id, serviceId: service.id } },
          create: { dossierId: d.id, serviceId: service.id, etat: "INTERESSE", interesseLe: new Date() },
          update: { etat: "INTERESSE", interesseLe: new Date() },
        });
        await journaliser(app.prisma, { acteurId: moi.id, role: "CANDIDAT", action: "SERVICE_INTERESSE", cibleType: "dossier", cibleId: d.id, details: { service: service.nom } });
        const nom = [d.prenoms, d.nom].filter(Boolean).join(" ") || "Un candidat";
        await envoyerAuxAdmins(app.prisma, config, {
          sujet: `Intérêt pour « ${service.nom} » : ${nom}`,
          texte: `Bonjour,\n\n${nom} est intéressé(e) par le service « ${service.nom} ».\n${config.URL_SITE.replace(/\/+$/, "")}/admin`,
        });
        return vue();
      },
    );

    // ---------- Côté cabinet ----------

    const params = z.object({ id: z.string().uuid("Identifiant invalide.") });

    app.get(
      "/admin/dossiers/:id/classement",
      { onRequest: admin, schema: { tags: ["Classement"], summary: "Grade, explication et services d'un dossier", params, response: { 200: sClassement } } },
      async (request) => {
        await dossierExistant(request.params.id);
        const historique = await app.prisma.gradeHistorique.findMany({ where: { dossierId: request.params.id }, orderBy: { id: "desc" }, take: 50 });
        return {
          ...(await vueClassement(app.prisma, config, request.params.id)),
          historique: historique.map((h) => ({ ...h, id: h.id.toString() })),
        };
      },
    );

    app.put(
      "/admin/dossiers/:id/niveau",
      {
        onRequest: admin,
        schema: {
          tags: ["Classement"],
          summary: "Évaluer le niveau dans le domaine (non évalué, insuffisant, suffisant)",
          params,
          body: z.object({ niveau: z.enum(NIVEAUX_EVALUES) }),
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        await dossierExistant(request.params.id);
        await app.prisma.dossier.update({
          where: { id: request.params.id },
          data: { niveauEvalue: request.body.niveau, niveauEvalueLe: new Date(), niveauEvalueParId: acteur.id },
        });
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "NIVEAU_EVALUE", cibleType: "dossier", cibleId: request.params.id, details: { niveau: request.body.niveau } });
        await recalculerGrade(app.prisma, config, request.params.id, "ADMIN", "Niveau évalué", acteur.id);
        return vueClassement(app.prisma, config, request.params.id);
      },
    );

    app.put(
      "/admin/dossiers/:id/services/:serviceId",
      {
        onRequest: admin,
        schema: {
          tags: ["Classement"],
          summary: "Faire avancer un service (accepté, en cours, réalisé) ou l'annuler",
          params: params.extend({ serviceId: z.string().uuid() }),
          body: z.object({ etat: z.enum(["ACCEPTE", "EN_COURS", "REALISE", "ANNULE"]) }),
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const { id, serviceId } = request.params;
        await dossierExistant(id);
        const service = await app.prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) throw erreurs.introuvable("Ce service");
        const suivi = await app.prisma.serviceCandidat.findUnique({ where: { dossierId_serviceId: { dossierId: id, serviceId } } });
        const avant: EtatService = suivi?.etat ?? "SUGGERE";
        const apres = request.body.etat as EtatService;
        if (apres !== "ANNULE" && avant !== "ANNULE" && ORDRE.indexOf(apres) <= ORDRE.indexOf(avant)) {
          throw erreurs.conflit("Un service ne peut qu'avancer : accepté, puis en cours, puis réalisé (ou être annulé).");
        }
        if (apres === "ANNULE" && !suivi) throw erreurs.conflit("Ce service n'a pas encore été demandé.");
        const date = { [DATE_ETAT[apres as keyof typeof DATE_ETAT]]: new Date() };
        await app.prisma.serviceCandidat.upsert({
          where: { dossierId_serviceId: { dossierId: id, serviceId } },
          create: { dossierId: id, serviceId, etat: apres, ...date },
          update: { etat: apres, ...date },
        });
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: "ADMIN",
          action: "SERVICE_ETAT_MODIFIE",
          cibleType: "dossier",
          cibleId: id,
          details: { service: service.nom, avant, apres },
        });
        // R-11 : un service réalisé (ou qui ne l'est plus) relance le calcul immédiatement.
        if (apres === "REALISE" || avant === "REALISE") {
          await recalculerGrade(app.prisma, config, id, "ADMIN", `Service « ${service.nom} » ${apres === "REALISE" ? "réalisé" : "annulé"}`, acteur.id);
        }
        return vueClassement(app.prisma, config, id);
      },
    );

    app.post(
      "/admin/dossiers/:id/grade/confirmer",
      { onRequest: admin, schema: { tags: ["Classement"], summary: "Confirmer le grade provisoire (un A exige les pièces vérifiées)", params } },
      async (request) => {
        await confirmerGrade(app.prisma, config, request.params.id, utilisateurDe(request).id);
        return vueClassement(app.prisma, config, request.params.id);
      },
    );

    app.post(
      "/admin/dossiers/:id/grade/corriger",
      {
        onRequest: admin,
        schema: {
          tags: ["Classement"],
          summary: "Corriger le grade (raison obligatoire)",
          params,
          body: z.object({
            grade: z.enum(GRADES),
            raison: z.string().trim().min(5, "Expliquez la raison de la correction (5 caractères minimum).").max(1000),
          }),
        },
      },
      async (request) => {
        await corrigerGrade(app.prisma, config, request.params.id, utilisateurDe(request).id, request.body.grade, request.body.raison);
        return vueClassement(app.prisma, config, request.params.id);
      },
    );

    app.post(
      "/admin/dossiers/:id/grade/liberer",
      { onRequest: admin, schema: { tags: ["Classement"], summary: "Libérer un grade confirmé ou corrigé (il redevient provisoire)", params } },
      async (request) => {
        await libererGrade(app.prisma, config, request.params.id, utilisateurDe(request).id);
        return vueClassement(app.prisma, config, request.params.id);
      },
    );
  };
}
