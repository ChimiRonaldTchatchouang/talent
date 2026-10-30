import {
  schemaCompetence,
  schemaCompetenceMaj,
  schemaDecisionCompetence,
  schemaDiplome,
  schemaDiplomeMaj,
  schemaDomaine,
  schemaDomaineMaj,
  schemaService,
  schemaServiceMaj,
  schemaTestLangue,
  schemaTestLangueMaj,
} from "@bdt/shared";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z, type ZodTypeAny } from "zod";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

const id = z.object({ id: z.string().uuid("Identifiant invalide.") });

const sDomaine = z.object({ id: z.string(), nom: z.string(), actif: z.boolean() });
const sCompetence = z.object({
  id: z.string(),
  nom: z.string(),
  domaineId: z.string(),
  domaine: z.string(),
  statut: z.enum(["VALIDEE", "PROPOSEE", "REJETEE"]),
  actif: z.boolean(),
});
const sTest = z.object({ id: z.string(), nom: z.string(), scoreMinimum: z.number().nullable(), actif: z.boolean() });
const sService = z.object({
  id: z.string(),
  nom: z.string(),
  description: z.string(),
  duree: z.string(),
  elementComble: z.enum(["TEST_LANGUE", "COACHING", "NIVEAU"]).nullable(),
  actif: z.boolean(),
});
const sDiplome = z.object({ id: z.string(), nom: z.string(), ordre: z.number(), actif: z.boolean() });

type Ligne = Record<string, unknown> & { id: string };

/** Accès homogène aux tables de référence, pour éviter de répéter cinq fois le même code. */
interface Definition {
  chemin: string;
  libelle: string;
  sortie: ZodTypeAny;
  creation: ZodTypeAny;
  maj: ZodTypeAny;
  lister: (db: PrismaClient, filtre: { actifSeulement: boolean; statut?: string }) => Promise<Ligne[]>;
  creer: (db: PrismaClient, donnees: Record<string, unknown>) => Promise<Ligne>;
  modifier: (db: PrismaClient, id: string, donnees: Record<string, unknown>) => Promise<Ligne>;
}

/** Tri alphabétique français (« Électricité » avec les E, pas après le Z). */
const comparer = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });
function trierParNom<T extends { nom: string }>(lignes: T[]): T[] {
  return [...lignes].sort((a, b) => comparer(a.nom, b.nom));
}

const versNombre = (d: Prisma.Decimal | null) => (d === null ? null : d.toNumber());

const competenceAvecDomaine = { domaine: { select: { nom: true } } } as const;
function formaterCompetence(
  c: Prisma.CompetenceGetPayload<{ include: typeof competenceAvecDomaine }>,
): z.infer<typeof sCompetence> {
  return {
    id: c.id,
    nom: c.nom,
    domaineId: c.domaineId,
    domaine: c.domaine.nom,
    statut: c.statut,
    actif: c.actif,
  };
}
const formaterTest = (t: {
  id: string;
  nom: string;
  scoreMinimum: Prisma.Decimal | null;
  actif: boolean;
}): Ligne & { nom: string } => ({
  ...t,
  scoreMinimum: versNombre(t.scoreMinimum),
});
const formaterService = (s: Ligne & { nom: string }) => ({
  id: s.id,
  nom: s.nom,
  description: s.description,
  duree: s.duree,
  elementComble: s.elementComble,
  actif: s.actif,
});

const DEFINITIONS: Definition[] = [
  {
    chemin: "domaines",
    libelle: "Le domaine",
    sortie: sDomaine,
    creation: schemaDomaine,
    maj: schemaDomaineMaj,
    lister: async (db, f) => trierParNom(await db.domaine.findMany({ where: f.actifSeulement ? { actif: true } : {} })),
    creer: (db, d) => db.domaine.create({ data: d as Prisma.DomaineCreateInput }),
    modifier: (db, id, d) => db.domaine.update({ where: { id }, data: d }),
  },
  {
    chemin: "competences",
    libelle: "La compétence",
    sortie: sCompetence,
    creation: schemaCompetence,
    maj: schemaCompetenceMaj,
    lister: async (db, f) =>
      (
        await db.competence.findMany({
          where: f.actifSeulement
            ? { actif: true, statut: "VALIDEE", domaine: { actif: true } }
            : f.statut
              ? { statut: f.statut as "VALIDEE" | "PROPOSEE" | "REJETEE" }
              : {},
          include: competenceAvecDomaine,
        })
      )
        .map(formaterCompetence)
        .sort((a, b) => comparer(a.domaine, b.domaine) || comparer(a.nom, b.nom)),
    creer: async (db, d) =>
      formaterCompetence(
        await db.competence.create({
          data: { ...(d as { nom: string; domaineId: string }), statut: "VALIDEE" },
          include: competenceAvecDomaine,
        }),
      ),
    modifier: async (db, id, d) =>
      formaterCompetence(await db.competence.update({ where: { id }, data: d, include: competenceAvecDomaine })),
  },
  {
    chemin: "tests-langue",
    libelle: "Le test de langue",
    sortie: sTest,
    creation: schemaTestLangue,
    maj: schemaTestLangueMaj,
    lister: async (db, f) =>
      trierParNom((await db.testLangue.findMany({ where: f.actifSeulement ? { actif: true } : {} })).map(formaterTest)),
    creer: async (db, d) => formaterTest(await db.testLangue.create({ data: d as Prisma.TestLangueCreateInput })),
    modifier: async (db, id, d) => formaterTest(await db.testLangue.update({ where: { id }, data: d })),
  },
  {
    chemin: "services",
    libelle: "Le service",
    sortie: sService,
    creation: schemaService,
    maj: schemaServiceMaj,
    lister: async (db, f) =>
      trierParNom((await db.service.findMany({ where: f.actifSeulement ? { actif: true } : {} })).map(formaterService)),
    creer: async (db, d) => formaterService(await db.service.create({ data: d as Prisma.ServiceCreateInput })),
    modifier: async (db, id, d) => formaterService(await db.service.update({ where: { id }, data: d })),
  },
  {
    chemin: "diplomes",
    libelle: "Le diplôme",
    sortie: sDiplome,
    creation: schemaDiplome,
    maj: schemaDiplomeMaj,
    lister: (db, f) =>
      db.diplome.findMany({ where: f.actifSeulement ? { actif: true } : {}, orderBy: { ordre: "asc" } }),
    creer: (db, d) => db.diplome.create({ data: d as Prisma.DiplomeCreateInput }),
    modifier: (db, id, d) => db.diplome.update({ where: { id }, data: d }),
  },
];

/** Traduit les erreurs de base de données en messages compréhensibles. */
function traduireErreurPrisma(e: unknown, libelle: string): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") throw erreurs.conflit("Un élément porte déjà ce nom. Choisissez un autre nom.");
    if (e.code === "P2025") throw erreurs.introuvable(libelle);
    if (e.code === "P2003") throw erreurs.invalide("Le domaine choisi n'existe pas.");
  }
  throw e;
}

const sListesActives = z.object({
  domaines: z.array(sDomaine),
  competences: z.array(sCompetence),
  testsLangue: z.array(sTest),
  services: z.array(sService),
  diplomes: z.array(sDiplome),
});

async function listesActives(app: FastifyInstance): Promise<z.infer<typeof sListesActives>> {
  const [domaines, competences, testsLangue, services, diplomes] = await Promise.all(
    DEFINITIONS.map((d) => d.lister(app.prisma, { actifSeulement: true })),
  );
  return { domaines, competences, testsLangue, services, diplomes } as z.infer<typeof sListesActives>;
}

export const routesReferentiels: FastifyPluginAsyncZod = async (app) => {
  // Lecture publique des éléments actifs : nécessaire aux formulaires du candidat.
  app.get(
    "/referentiels",
    {
      schema: {
        tags: ["Listes de référence"],
        summary: "Éléments actifs des listes de référence",
        response: { 200: sListesActives },
      },
    },
    async () => listesActives(app),
  );

  const admin = exigerRole("ADMIN");

  for (const def of DEFINITIONS) {
    app.get(
      `/admin/referentiels/${def.chemin}`,
      {
        onRequest: admin,
        schema: {
          tags: ["Listes de référence"],
          summary: `Lister (${def.chemin}), y compris les éléments désactivés`,
          querystring: z.object({ statut: z.enum(["VALIDEE", "PROPOSEE", "REJETEE"]).optional() }),
          response: { 200: z.object({ elements: z.array(def.sortie) }) },
        },
      },
      async (request) => ({
        elements: await def.lister(app.prisma, { actifSeulement: false, statut: request.query.statut }),
      }),
    );

    app.post(
      `/admin/referentiels/${def.chemin}`,
      {
        onRequest: admin,
        schema: {
          tags: ["Listes de référence"],
          summary: `Ajouter (${def.chemin})`,
          body: def.creation,
          response: { 201: z.object({ element: def.sortie }) },
        },
      },
      async (request, reply) => {
        const acteur = utilisateurDe(request);
        const element = await def
          .creer(app.prisma, request.body as Record<string, unknown>)
          .catch((e) => traduireErreurPrisma(e, def.libelle));
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: acteur.role,
          action: "REFERENTIEL_AJOUT",
          cibleType: def.chemin,
          cibleId: element.id,
          details: request.body as Prisma.InputJsonValue,
          ip: request.ip,
        });
        return reply.code(201).send({ element });
      },
    );

    app.patch(
      `/admin/referentiels/${def.chemin}/:id`,
      {
        onRequest: admin,
        schema: {
          tags: ["Listes de référence"],
          summary: `Renommer, modifier, désactiver ou réactiver (${def.chemin})`,
          params: id,
          body: def.maj,
          response: { 200: z.object({ element: def.sortie }) },
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const donnees = request.body as Record<string, unknown>;
        if (Object.keys(donnees).length === 0) throw erreurs.invalide("Aucune modification à enregistrer.");
        const element = await def
          .modifier(app.prisma, request.params.id, donnees)
          .catch((e) => traduireErreurPrisma(e, def.libelle));
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: acteur.role,
          action: "REFERENTIEL_MODIFICATION",
          cibleType: def.chemin,
          cibleId: element.id,
          details: donnees as Prisma.InputJsonValue,
          ip: request.ip,
        });
        return { element };
      },
    );
  }

  // File « à valider » : compétences proposées par les candidats.
  app.post(
    "/admin/referentiels/competences/:id/decision",
    {
      onRequest: admin,
      schema: {
        tags: ["Listes de référence"],
        summary: "Valider ou rejeter une compétence proposée",
        params: id,
        body: schemaDecisionCompetence,
        response: { 200: z.object({ element: sCompetence }) },
      },
    },
    async (request) => {
      const acteur = utilisateurDe(request);
      const competence = await app.prisma.competence.findUnique({ where: { id: request.params.id } });
      if (!competence) throw erreurs.introuvable("La compétence");
      if (competence.statut !== "PROPOSEE") throw erreurs.conflit("Cette compétence a déjà été traitée.");
      const maj = await app.prisma.competence.update({
        where: { id: competence.id },
        data: { statut: request.body.decision },
        include: competenceAvecDomaine,
      });
      await journaliser(app.prisma, {
        acteurId: acteur.id,
        role: acteur.role,
        action: request.body.decision === "VALIDEE" ? "COMPETENCE_VALIDEE" : "COMPETENCE_REJETEE",
        cibleType: "competences",
        cibleId: competence.id,
        ip: request.ip,
      });
      return { element: formaterCompetence(maj) };
    },
  );
};
