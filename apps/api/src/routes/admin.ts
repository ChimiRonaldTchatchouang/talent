import { randomBytes } from "node:crypto";
import { LIBELLES_PIECES, MOTIFS_REFUS_RAPIDES, type TypePiece } from "@bdt/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { recalculerGrade } from "../lib/classement.js";
import type { Config } from "../lib/config.js";
import { formaterDossier, formaterPieces, inclusionDossier, sommaire } from "../lib/dossier.js";
import { envoyerEmail, modeles } from "../lib/emails.js";
import { erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { lienFichier } from "../lib/liens.js";
import { hacherMotDePasse } from "../lib/mots-de-passe.js";
import { creerDonneesDemo, effacerDonneesDemo, etatDemo } from "../lib/demo.js";
import { rechercherVivier, schemaFiltres, versCsv } from "../lib/vivier.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";
import { vueClassement } from "./classement.js";

const TAILLE_PAGE = 50;

/** Espace administrateur : tableau de bord, vivier, fiche candidat, vérification des pièces (M7, M8). */
export function routesAdmin(config: Config & { SECRET_LIENS: string }): FastifyPluginAsyncZod {
  return async (app) => {
    const admin = exigerRole("ADMIN");
    const id = z.object({ id: z.string().uuid("Identifiant invalide.") });

    app.get(
      "/admin/tableau-de-bord",
      { onRequest: admin, schema: { tags: ["Administration"], summary: "Compteurs du tableau de bord" } },
      async () => {
        const db = app.prisma;
        const [parGrade, brouillons, piecesAVerifier, aConfirmer, alertes, interesses, derniers] = await Promise.all([
          db.gradeDossier.groupBy({ by: ["grade"], where: { dossier: { statut: "ENVOYE" } }, _count: true }),
          db.dossier.count({ where: { statut: "BROUILLON" } }),
          db.piece.count({ where: { etat: "DEPOSEE", dossier: { statut: "ENVOYE" } } }),
          db.gradeDossier.count({ where: { etat: "PROVISOIRE", dossier: { statut: "ENVOYE" } } }),
          db.gradeDossier.count({ where: { alerte: true, dossier: { statut: "ENVOYE" } } }),
          db.serviceCandidat.count({ where: { etat: "INTERESSE" } }),
          db.dossier.findMany({
            where: { statut: "ENVOYE" },
            orderBy: { envoyeLe: "desc" },
            take: 6,
            select: { id: true, prenoms: true, nom: true, ville: true, metier: true, envoyeLe: true, grade: { select: { grade: true, etat: true } } },
          }),
        ]);
        const compte = (g: string) => parGrade.find((x) => x.grade === g)?._count ?? 0;
        return {
          grades: { A: compte("A"), B: compte("B"), C: compte("C"), D: compte("D"), HORS_BASSIN: compte("HORS_BASSIN") },
          brouillons,
          piecesAVerifier,
          gradesAConfirmer: aConfirmer,
          alertes,
          servicesInteresses: interesses,
          suppressionsEnAttente: await db.demandeSuppression.count({ where: { statut: "EN_ATTENTE" } }),
          selectionsRecues: await db.selectionEnvoyee.count({ where: { remplaceeLe: null, lignes: { some: { statut: "A_CONTACTER" } } } }),
          derniers: derniers.map((d) => ({
            id: d.id,
            nomComplet: [d.prenoms, d.nom].filter(Boolean).join(" ") || "Sans nom",
            ville: d.ville,
            metier: d.metier,
            envoyeLe: d.envoyeLe,
            grade: d.grade?.grade ?? null,
            etatGrade: d.grade?.etat ?? null,
          })),
        };
      },
    );

    app.get(
      "/admin/vivier",
      {
        onRequest: admin,
        schema: {
          tags: ["Administration"],
          summary: "Candidats du vivier, filtres combinables (dossiers envoyés uniquement)",
          querystring: schemaFiltres.extend({
            page: z.coerce.number().int().min(1).default(1),
            tout: z.enum(["true", "false"]).optional(),
          }),
        },
      },
      async (request) => {
        const { page, tout, ...filtres } = request.query;
        const resultats = await rechercherVivier(app.prisma, filtres);
        const candidats = tout === "true" ? resultats.slice(0, 1000) : resultats.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE);
        return { total: resultats.length, page, parPage: TAILLE_PAGE, candidats };
      },
    );

    app.get(
      "/admin/vivier/export",
      {
        onRequest: admin,
        schema: { tags: ["Administration"], summary: "Exporter la liste filtrée en CSV (Excel), sans les pièces", querystring: schemaFiltres },
      },
      async (request, reply) => {
        const acteur = utilisateurDe(request);
        const resultats = await rechercherVivier(app.prisma, request.query);
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: "ADMIN",
          action: "VIVIER_EXPORTE",
          cibleType: "vivier",
          details: { nombre: resultats.length, filtres: request.query as object },
          ip: request.ip,
        });
        const date = new Date().toISOString().slice(0, 10);
        return reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header("Content-Disposition", `attachment; filename="vivier-${date}.csv"`)
          .header("Cache-Control", "no-store")
          .send(versCsv(resultats));
      },
    );

    app.get(
      "/admin/dossiers/:id",
      { onRequest: admin, schema: { tags: ["Administration"], summary: "Fiche complète d'un candidat (consultation journalisée)", params: id } },
      async (request) => {
        const acteur = utilisateurDe(request);
        const d = await app.prisma.dossier.findUnique({
          where: { id: request.params.id },
          include: { ...inclusionDossier, utilisateur: { select: { id: true, email: true, telephone: true, emailVerifieLe: true, creeLe: true, derniereConnexion: true, estDemo: true } } },
        });
        if (!d) throw erreurs.introuvable("Ce dossier");
        const [notes, journal, suivis] = await Promise.all([
          app.prisma.noteInterne.findMany({ where: { dossierId: d.id }, orderBy: { creeLe: "desc" } }),
          app.prisma.journal.findMany({
            where: { OR: [{ cibleId: d.id }, { cibleId: d.utilisateurId }, { cibleId: { in: d.pieces.map((p) => p.id) } }] },
            orderBy: { id: "desc" },
            take: 100,
          }),
          app.prisma.serviceCandidat.findMany({ where: { dossierId: d.id }, include: { service: { select: { nom: true } } } }),
        ]);
        const auteurs = await app.prisma.utilisateur.findMany({
          where: { id: { in: [...notes.map((n) => n.auteurId), ...journal.map((j) => j.acteurId)].filter((x): x is string => !!x) } },
          select: { id: true, nom: true, email: true, telephone: true, role: true },
        });
        const nomDe = (uid: string | null) => {
          const a = auteurs.find((x) => x.id === uid);
          return a ? (a.role === "CANDIDAT" ? "Le candidat" : (a.nom ?? a.email ?? "Administrateur")) : uid ? "Compte supprimé" : "Système";
        };
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "DOSSIER_CONSULTE", cibleType: "dossier", cibleId: d.id, ip: request.ip });
        return {
          dossier: formaterDossier(d),
          ...sommaire(d),
          pieces: formaterPieces(d),
          compte: {
            email: d.utilisateur.email,
            telephone: d.utilisateur.telephone,
            emailConfirme: d.utilisateur.emailVerifieLe !== null,
            creeLe: d.utilisateur.creeLe,
            derniereConnexion: d.utilisateur.derniereConnexion,
            demo: d.utilisateur.estDemo,
          },
          consentements: { traitementLe: d.consentementTraitementLe, recruteursLe: d.consentementRecruteursLe },
          classement: await vueClassement(app.prisma, config, d.id),
          suivisServices: suivis.map((s) => ({ service: s.service.nom, etat: s.etat, interesseLe: s.interesseLe, realiseLe: s.realiseLe, modifieLe: s.modifieLe })),
          notes: notes.map((n) => ({ id: n.id, texte: n.texte, auteur: nomDe(n.auteurId), creeLe: n.creeLe })),
          historique: journal.map((j) => ({ id: j.id.toString(), action: j.action, acteur: nomDe(j.acteurId), details: j.details, creeLe: j.creeLe })),
        };
      },
    );

    app.post(
      "/admin/dossiers/:id/notes",
      {
        onRequest: admin,
        schema: {
          tags: ["Administration"],
          summary: "Ajouter une note interne (jamais visible par le candidat)",
          params: id,
          body: z.object({ texte: z.string().trim().min(1, "Écrivez la note.").max(4000, "4 000 caractères maximum.") }),
        },
      },
      async (request, reply) => {
        const acteur = utilisateurDe(request);
        const d = await app.prisma.dossier.findUnique({ where: { id: request.params.id } });
        if (!d) throw erreurs.introuvable("Ce dossier");
        const note = await app.prisma.noteInterne.create({ data: { dossierId: d.id, auteurId: acteur.id, texte: request.body.texte } });
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "NOTE_AJOUTEE", cibleType: "dossier", cibleId: d.id });
        return reply.code(201).send({ note: { id: note.id, texte: note.texte, auteur: acteur.nom ?? acteur.email ?? "Administrateur", creeLe: note.creeLe } });
      },
    );

    app.post(
      "/admin/dossiers/:id/mot-de-passe",
      {
        onRequest: admin,
        schema: {
          tags: ["Administration"],
          summary: "Réinitialiser le mot de passe d'un candidat (ex. compte sans e-mail) : un mot de passe provisoire est affiché une fois",
          params: id,
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const d = await app.prisma.dossier.findUnique({ where: { id: request.params.id } });
        if (!d) throw erreurs.introuvable("Ce dossier");
        // Lisible au téléphone : 10 caractères sans lettres ambiguës.
        const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
        const motDePasse = Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
        await app.prisma.$transaction([
          app.prisma.utilisateur.update({
            where: { id: d.utilisateurId },
            data: { motDePasseHash: await hacherMotDePasse(motDePasse), tentativesEchouees: 0, bloqueJusquA: null },
          }),
          app.prisma.session.deleteMany({ where: { utilisateurId: d.utilisateurId } }),
        ]);
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "MOT_DE_PASSE_REINITIALISE_PAR_ADMIN", cibleType: "utilisateur", cibleId: d.utilisateurId, ip: request.ip });
        return { motDePasse, message: "Communiquez ce mot de passe provisoire au candidat. Il ne sera plus affiché." };
      },
    );

    // ---------- Vérification des pièces (M8, W5) ----------

    app.get(
      "/admin/pieces",
      {
        onRequest: admin,
        schema: {
          tags: ["Vérification"],
          summary: "File des pièces à vérifier, avec les informations déclarées à côté",
          querystring: z.object({ etat: z.enum(["DEPOSEE", "VERIFIEE", "REFUSEE"]).default("DEPOSEE") }),
        },
      },
      async (request) => {
        const pieces = await app.prisma.piece.findMany({
          where: { etat: request.query.etat, dossier: { statut: "ENVOYE" } },
          orderBy: { deposeLe: "asc" },
          take: 200,
          include: {
            fichier: { select: { typeMime: true, taille: true } },
            evenements: { where: { etat: "REFUSEE" }, orderBy: { id: "asc" } },
            dossier: { include: { diplome: { select: { nom: true } }, testLangue: { select: { nom: true, scoreMinimum: true } }, experiences: { orderBy: { ordre: "asc" } } } },
          },
        });
        const jour = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);
        return {
          motifsRapides: MOTIFS_REFUS_RAPIDES,
          pieces: pieces.map((p) => {
            const d = p.dossier;
            // Ce que le candidat a déclaré, à comparer avec le document.
            const parType: Record<string, [string, string | null][]> = {
              IDENTITE: [["Nom", d.nom], ["Prénom(s)", d.prenoms], ["Date de naissance", jour(d.dateNaissance)], ["Nationalité", d.nationalite], ["Passeport expire le", jour(d.passeportExpiration)]],
              DIPLOME: [["Niveau", d.diplome?.nom ?? null], ["Diplôme", d.diplomeIntitule], ["Établissement", d.etablissement], ["Année", d.diplomeAnnee?.toString() ?? null], ["Pays", d.diplomePays]],
              ATTESTATION_LANGUE: [["Test", d.testLangue?.nom ?? null], ["Score déclaré", d.testScore?.toString() ?? null], ["Minimum accepté", d.testLangue?.scoreMinimum?.toString() ?? "Aucun"], ["Date", jour(d.testDate)]],
              CERTIFICAT_TRAVAIL: d.experiences.map((e) => [e.employeur, `${e.poste} (${e.debut ?? "?"} → ${e.fin ?? "en cours"})`] as [string, string | null]),
              CV: [["Métier", d.metier]],
            };
            const declare = parType[p.type] ?? [];
            return {
              id: p.id,
              type: p.type,
              libelle: LIBELLES_PIECES[p.type as TypePiece],
              etat: p.etat,
              nomFichier: p.nomFichier,
              typeMime: p.fichier.typeMime,
              taille: p.fichier.taille,
              deposeLe: p.deposeLe,
              motifRefus: p.motifRefus,
              refusPrecedents: p.evenements.map((e) => ({ motif: e.motif, le: e.creeLe })),
              dossierId: d.id,
              candidat: [d.prenoms, d.nom].filter(Boolean).join(" ") || "Sans nom",
              declare,
            };
          }),
        };
      },
    );

    app.get(
      "/admin/pieces/:id/lien",
      { onRequest: admin, schema: { tags: ["Vérification"], summary: "Lien temporaire (10 minutes) vers le document (consultation journalisée)", params: id } },
      async (request) => {
        const piece = await app.prisma.piece.findUnique({ where: { id: request.params.id } });
        if (!piece) throw erreurs.introuvable("Cette pièce");
        await journaliser(app.prisma, { acteurId: utilisateurDe(request).id, role: "ADMIN", action: "PIECE_CONSULTEE", cibleType: "piece", cibleId: piece.id, ip: request.ip });
        return lienFichier(config, piece.fichierId);
      },
    );

    app.post(
      "/admin/pieces/:id/decision",
      {
        onRequest: admin,
        schema: {
          tags: ["Vérification"],
          summary: "Marquer une pièce vérifiée, ou la refuser avec un motif obligatoire",
          params: id,
          body: z.discriminatedUnion("decision", [
            z.object({ decision: z.literal("VERIFIEE") }),
            z.object({ decision: z.literal("REFUSEE"), motif: z.string().trim().min(3, "Indiquez le motif du refus.").max(500) }),
          ]),
        },
      },
      async (request) => {
        const acteur = utilisateurDe(request);
        const piece = await app.prisma.piece.findUnique({
          where: { id: request.params.id },
          include: { dossier: { include: { utilisateur: { select: { email: true } } } } },
        });
        if (!piece) throw erreurs.introuvable("Cette pièce");
        if (piece.etat !== "DEPOSEE") throw erreurs.conflit("Cette pièce a déjà été traitée. Rechargez la page.");
        const body = request.body;
        const motif = body.decision === "REFUSEE" ? body.motif : null;
        await app.prisma.$transaction([
          app.prisma.piece.update({
            where: { id: piece.id },
            data: { etat: body.decision, motifRefus: motif, verifieLe: new Date(), verifieParId: acteur.id },
          }),
          app.prisma.pieceEvenement.create({ data: { pieceId: piece.id, etat: body.decision, motif, acteurId: acteur.id } }),
        ]);
        await journaliser(app.prisma, {
          acteurId: acteur.id,
          role: "ADMIN",
          action: body.decision === "VERIFIEE" ? "PIECE_VERIFIEE" : "PIECE_REFUSEE",
          cibleType: "piece",
          cibleId: piece.id,
          details: { type: piece.type, motif },
          ip: request.ip,
        });
        if (body.decision === "REFUSEE") {
          const email = piece.dossier.utilisateur.email ?? piece.dossier.emailContact;
          if (email) {
            await envoyerEmail(
              app.prisma,
              config,
              email,
              modeles.pieceRefusee({ piece: piece.type as TypePiece, motif: motif!, lien: `${config.URL_SITE.replace(/\/+$/, "")}/candidat/justificatifs` }),
            );
          }
        }
        await recalculerGrade(app.prisma, config, piece.dossierId, "ADMIN", `Pièce ${body.decision === "VERIFIEE" ? "vérifiée" : "refusée"}`, acteur.id);
        return { etat: body.decision };
      },
    );

    // ---------- Suivi des services (M6) ----------

    app.get(
      "/admin/services-demandes",
      {
        onRequest: admin,
        schema: {
          tags: ["Administration"],
          summary: "Services demandés ou en cours",
          querystring: z.object({ etat: z.enum(["INTERESSE", "ACCEPTE", "EN_COURS", "REALISE", "ANNULE"]).optional() }),
        },
      },
      async (request) => {
        const lignes = await app.prisma.serviceCandidat.findMany({
          where: request.query.etat ? { etat: request.query.etat } : { etat: { in: ["INTERESSE", "ACCEPTE", "EN_COURS"] } },
          orderBy: { modifieLe: "desc" },
          take: 300,
          include: {
            service: { select: { id: true, nom: true } },
            dossier: { select: { id: true, prenoms: true, nom: true, telephoneContact: true, grade: { select: { grade: true } } } },
          },
        });
        return {
          demandes: lignes.map((l) => ({
            dossierId: l.dossier.id,
            candidat: [l.dossier.prenoms, l.dossier.nom].filter(Boolean).join(" ") || "Sans nom",
            telephone: l.dossier.telephoneContact,
            grade: l.dossier.grade?.grade ?? null,
            serviceId: l.service.id,
            service: l.service.nom,
            etat: l.etat,
            modifieLe: l.modifieLe,
          })),
        };
      },
    );

    // ---------- Données de démonstration (lot 6) ----------

    app.get(
      "/admin/demo",
      { onRequest: admin, schema: { tags: ["Démonstration"], summary: "Données de démonstration présentes ?" } },
      async () => etatDemo(app.prisma),
    );

    app.post(
      "/admin/demo",
      {
        onRequest: admin,
        schema: { tags: ["Démonstration"], summary: "Créer ~20 candidats fictifs, un compte candidat et un compte recruteur de test (mots de passe affichés une fois)" },
      },
      async (request, reply) => {
        const acteur = utilisateurDe(request);
        if ((await etatDemo(app.prisma)).actif) throw erreurs.conflit("Les données de démonstration existent déjà. Effacez-les d'abord.");
        const comptes = await creerDonneesDemo(app.prisma, config, acteur.id);
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "DEMO_CREEE", cibleType: "demo", ip: request.ip });
        return reply.code(201).send({ ...(await etatDemo(app.prisma)), comptes });
      },
    );

    app.delete(
      "/admin/demo",
      { onRequest: admin, schema: { tags: ["Démonstration"], summary: "Effacer toutes les données de démonstration" } },
      async (request) => {
        const acteur = utilisateurDe(request);
        const nombre = await effacerDonneesDemo(app.prisma);
        await journaliser(app.prisma, { acteurId: acteur.id, role: "ADMIN", action: "DEMO_EFFACEE", cibleType: "demo", details: { comptes: nombre }, ip: request.ip });
        return { comptesEffaces: nombre, ...(await etatDemo(app.prisma)) };
      },
    );
  };
}
