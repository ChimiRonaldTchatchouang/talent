import {
  ETAPES_FORMULAIRE,
  LIBELLES_ETAPES,
  SCHEMAS_ETAPES,
  schemaEnregistrementEtape,
  type EtapeFormulaire,
} from "@bdt/shared";
import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { recalculerGrade } from "../lib/classement.js";
import type { Config } from "../lib/config.js";
import {
  champsManquants,
  formaterDossier,
  formaterPieces,
  inclusionDossier,
  piecesManquantes,
  sommaire,
  type DossierComplet,
} from "../lib/dossier.js";
import { envoyerAuxAdmins, envoyerEmail, modeles } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const versDate = (v: unknown) => (typeof v === "string" ? new Date(`${v}T00:00:00Z`) : (v as null | undefined));

/** Dossier du candidat connecté. Un candidat n'accède jamais qu'à son propre dossier. */
async function chargerDossier(app: Parameters<FastifyPluginAsyncZod>[0], utilisateurId: string): Promise<DossierComplet> {
  const dossier = await app.prisma.dossier.findUnique({ where: { utilisateurId }, include: inclusionDossier });
  if (!dossier) throw erreurs.introuvable("Ton dossier");
  return dossier;
}

function reponseDossier(d: DossierComplet) {
  return { dossier: formaterDossier(d), ...sommaire(d), pieces: formaterPieces(d) };
}

export function routesCandidat(config: Config): FastifyPluginAsyncZod {
  return async (app) => {
    const candidat = exigerRole("CANDIDAT");

    app.get(
      "/candidat/dossier",
      { onRequest: candidat, schema: { tags: ["Dossier candidat"], summary: "Mon dossier, l'état de chaque étape et mes pièces" } },
      async (request) => reponseDossier(await chargerDossier(app, utilisateurDe(request).id)),
    );

    app.put(
      "/candidat/dossier/etapes/:etape",
      {
        onRequest: candidat,
        schema: {
          tags: ["Dossier candidat"],
          summary: "Enregistrer une étape (enregistrement automatique, ou « Continuer » avec terminer=true)",
          params: z.object({ etape: z.enum(ETAPES_FORMULAIRE) }),
          body: schemaEnregistrementEtape,
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const etape: EtapeFormulaire = request.params.etape;
        const analyse = SCHEMAS_ETAPES[etape].safeParse(request.body.donnees);
        if (!analyse.success) {
          const details: Record<string, string> = {};
          for (const i of analyse.error.issues) details[i.path.join(".") || "donnees"] ??= i.message;
          throw erreurs.invalide("Certaines réponses sont invalides. Vérifie le formulaire.", details);
        }
        const avant = await chargerDossier(app, moi.id);
        const donnees = analyse.data as Record<string, unknown>;
        const maj: Prisma.DossierUpdateInput = { derniereEtape: etape };
        const champsSimples = Object.entries(donnees).filter(
          ([cle, v]) => v !== undefined && !["experiences", "competenceIds", "diplomeId", "testLangueId", "domaineId"].includes(cle),
        );
        for (const [cle, valeur] of champsSimples) {
          const estDate = ["dateNaissance", "passeportExpiration", "testDate"].includes(cle);
          (maj as Record<string, unknown>)[cle] = estDate ? versDate(valeur) : valeur === "" ? null : valeur;
        }

        // Listes de référence : un élément désactivé n'est plus proposé, mais reste accepté s'il est déjà dans le dossier.
        const reference = async (
          cle: "diplomeId" | "testLangueId" | "domaineId",
          relation: "diplome" | "testLangue" | "domaine",
          existe: (id: string) => Promise<boolean>,
        ) => {
          const id = donnees[cle] as string | null | undefined;
          if (id === undefined) return;
          if (id === null) {
            (maj as Record<string, unknown>)[relation] = { disconnect: true };
            return;
          }
          if (id !== avant[cle] && !(await existe(id))) throw erreurs.invalide("Ce choix n'est plus disponible.", { [cle]: "Choix invalide." });
          (maj as Record<string, unknown>)[relation] = { connect: { id } };
        };
        await reference("diplomeId", "diplome", async (id) => !!(await app.prisma.diplome.findFirst({ where: { id, actif: true } })));
        await reference("testLangueId", "testLangue", async (id) => !!(await app.prisma.testLangue.findFirst({ where: { id, actif: true } })));
        await reference("domaineId", "domaine", async (id) => !!(await app.prisma.domaine.findFirst({ where: { id, actif: true } })));

        const competenceIds = donnees.competenceIds as string[] | undefined;
        if (competenceIds) {
          const deja = new Set(avant.competences.map((c) => c.competenceId));
          const nouvelles = [...new Set(competenceIds)].filter((id) => !deja.has(id));
          // Autorisées : compétences validées et actives, ou en attente de validation (plusieurs candidats
          // peuvent proposer la même). Les compétences rejetées ou désactivées sont refusées.
          const valides = await app.prisma.competence.count({
            where: {
              id: { in: nouvelles },
              OR: [{ statut: "VALIDEE", actif: true }, { statut: "PROPOSEE" }],
            },
          });
          if (valides !== nouvelles.length) throw erreurs.invalide("Une compétence choisie n'est pas disponible.", { competenceIds: "Choix invalide." });
        }

        await app.prisma.$transaction(async (tx) => {
          await tx.dossier.update({ where: { id: avant.id }, data: maj });
          const experiences = donnees.experiences as z.infer<typeof SCHEMAS_ETAPES.TRAVAIL>["experiences"];
          if (experiences) {
            await tx.experience.deleteMany({ where: { dossierId: avant.id } });
            await tx.experience.createMany({
              data: experiences.map((e, ordre) => ({ ...e, dossierId: avant.id, ordre })),
            });
          }
          if (competenceIds) {
            await tx.dossierCompetence.deleteMany({ where: { dossierId: avant.id } });
            await tx.dossierCompetence.createMany({
              data: [...new Set(competenceIds)].map((competenceId) => ({ dossierId: avant.id, competenceId })),
            });
          }
          await journaliser(tx, {
            acteurId: moi.id,
            role: "CANDIDAT",
            action: avant.statut === "ENVOYE" ? "DOSSIER_MODIFIE_APRES_ENVOI" : "DOSSIER_MODIFIE",
            cibleType: "dossier",
            cibleId: avant.id,
            details: { etape },
          });
        });

        await recalculerGrade(app.prisma, config, avant.id, "CANDIDAT", `Dossier modifié : ${LIBELLES_ETAPES[etape]}`, moi.id);
        const apres = await chargerDossier(app, moi.id);
        const manques = champsManquants(apres, etape);
        if (request.body.terminer && Object.keys(manques).length > 0) {
          // Les réponses sont enregistrées, mais l'étape n'est pas complète.
          throw erreurs.invalide(`Il manque des réponses dans « ${LIBELLES_ETAPES[etape]} ».`, manques);
        }
        return reponseDossier(apres);
      },
    );

    app.post(
      "/candidat/competences",
      {
        onRequest: candidat,
        config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
        schema: {
          tags: ["Dossier candidat"],
          summary: "Proposer une compétence absente de la liste (elle sera validée par le cabinet)",
          body: z.object({
            domaineId: z.string().uuid("Domaine invalide."),
            nom: z.string().trim().min(2, "Écris au moins 2 caractères.").max(80, "80 caractères maximum."),
          }),
          response: {
            201: z.object({ competence: z.object({ id: z.string(), nom: z.string(), domaine: z.string(), statut: z.string() }) }),
          },
        },
      },
      async (request, reply) => {
        const moi = utilisateurDe(request);
        const domaine = await app.prisma.domaine.findFirst({ where: { id: request.body.domaineId, actif: true } });
        if (!domaine) throw erreurs.invalide("Ce domaine n'est plus disponible.");
        // Même nom (sans tenir compte des majuscules) : on réutilise la compétence existante.
        const existante = await app.prisma.competence.findFirst({
          where: { domaineId: domaine.id, nom: { equals: request.body.nom, mode: "insensitive" } },
        });
        if (existante && existante.statut === "REJETEE") {
          throw erreurs.invalide("Cette compétence a déjà été proposée et n'a pas été retenue par le cabinet.");
        }
        const competence =
          existante ??
          (await app.prisma.competence.create({
            data: { nom: request.body.nom, domaineId: domaine.id, statut: "PROPOSEE", proposeeParId: moi.id },
          }));
        if (!existante) {
          await journaliser(app.prisma, { acteurId: moi.id, role: "CANDIDAT", action: "COMPETENCE_PROPOSEE", cibleType: "competences", cibleId: competence.id });
        }
        return reply.code(201).send({ competence: { id: competence.id, nom: competence.nom, domaine: domaine.nom, statut: competence.statut } });
      },
    );

    app.put(
      "/candidat/consentements",
      {
        onRequest: candidat,
        schema: {
          tags: ["Dossier candidat"],
          summary: "Accepter ou retirer la présentation de mon profil anonymisé aux recruteurs",
          body: z.object({ recruteurs: z.boolean() }),
          response: { 200: z.object({ consentementRecruteurs: z.boolean() }) },
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const dossier = await chargerDossier(app, moi.id);
        await app.prisma.dossier.update({
          where: { id: dossier.id },
          data: { consentementRecruteursLe: request.body.recruteurs ? new Date() : null },
        });
        await journaliser(app.prisma, {
          acteurId: moi.id,
          role: "CANDIDAT",
          action: request.body.recruteurs ? "CONSENTEMENT_RECRUTEURS_DONNE" : "CONSENTEMENT_RECRUTEURS_RETIRE",
          cibleType: "dossier",
          cibleId: dossier.id,
        });
        return { consentementRecruteurs: request.body.recruteurs };
      },
    );

    app.post(
      "/candidat/dossier/envoyer",
      {
        onRequest: candidat,
        schema: {
          tags: ["Dossier candidat"],
          summary: "Envoyer mon dossier (les pièces manquantes n'empêchent pas l'envoi)",
          body: z.object({
            certifie: z.literal(true, {
              errorMap: () => ({ message: "Coche la case « Je certifie l'exactitude de mes informations »." }),
            }),
          }),
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const dossier = await chargerDossier(app, moi.id);
        if (dossier.statut === "ENVOYE") throw erreurs.conflit("Ton dossier est déjà envoyé. Tu peux encore le modifier.");
        const { etapes, pretAEnvoyer } = sommaire(dossier);
        if (!pretAEnvoyer) {
          const details = Object.fromEntries(
            etapes
              .filter((e) => e.etape !== "JUSTIFICATIFS" && e.etat !== "TERMINE" && e.etat !== "SAUTE")
              .map((e) => [e.etape, `« ${LIBELLES_ETAPES[e.etape]} » n'est pas terminée.`]),
          );
          throw erreurs.invalide("Termine toutes les étapes avant d'envoyer ton dossier.", details);
        }
        const maintenant = new Date();
        const envoye = await app.prisma.dossier.update({
          where: { id: dossier.id },
          data: { statut: "ENVOYE", envoyeLe: maintenant, certifieLe: maintenant },
          include: inclusionDossier,
        });
        await journaliser(app.prisma, {
          acteurId: moi.id,
          role: "CANDIDAT",
          action: "DOSSIER_ENVOYE",
          cibleType: "dossier",
          cibleId: dossier.id,
          details: { piecesManquantes: piecesManquantes(envoye) },
        });
        await recalculerGrade(app.prisma, config, dossier.id, "CANDIDAT", "Dossier envoyé", moi.id);
        const site = config.URL_SITE.replace(/\/+$/, "");
        const email = moi.email ?? envoye.emailContact;
        const manquantes = piecesManquantes(envoye);
        if (email) {
          await envoyerEmail(app.prisma, config, email, modeles.dossierEnvoyeCandidat({ envoyeLe: maintenant, piecesManquantes: manquantes, lienEspace: `${site}/candidat` }));
        }
        const nom = [envoye.prenoms, envoye.nom].filter(Boolean).join(" ") || "Candidat";
        const grade = await app.prisma.gradeDossier.findUnique({ where: { dossierId: dossier.id }, select: { grade: true } });
        await envoyerAuxAdmins(
          app.prisma,
          config,
          modeles.dossierEnvoyeAdmin({
            nom,
            metier: envoye.aTravaille ? envoye.metier : null,
            ville: envoye.ville,
            grade: grade?.grade ?? null,
            piecesManquantes: manquantes.length,
            lien: `${site}/admin/candidats/${dossier.id}`,
          }),
        );
        return reponseDossier(envoye);
      },
    );
  };
}
