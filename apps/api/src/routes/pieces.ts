import { createHash } from "node:crypto";
import { LIBELLES_PIECES, schemaTypePiece, TAILLE_MAX_FICHIER, type TypePiece } from "@bdt/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { Config } from "../lib/config.js";
import { ErreurMetier, erreurs } from "../lib/erreurs.js";
import { journaliser } from "../lib/journal.js";
import { signer, verifier } from "../lib/liens.js";
import { exigerRole, utilisateurDe } from "../plugins/authentification.js";

/** Types de pièce dont le candidat peut déposer plusieurs exemplaires. */
const TYPES_MULTIPLES: TypePiece[] = ["CERTIFICAT_TRAVAIL"];
const DUREE_AUTORISATION_S = 15 * 60;
const DUREE_LIEN_FICHIER_S = 10 * 60;

interface Autorisation {
  d: string; // dossier
  u: string; // utilisateur
  t: TypePiece;
  p: string | null; // pièce remplacée
}

/** Format réel du fichier, lu dans ses premiers octets (on ne se fie pas au nom ni au navigateur). */
export function detecterFormat(contenu: Buffer): "image/jpeg" | "image/png" | "application/pdf" | null {
  if (contenu.length >= 3 && contenu[0] === 0xff && contenu[1] === 0xd8 && contenu[2] === 0xff) return "image/jpeg";
  if (contenu.length >= 8 && contenu.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (contenu.length >= 5 && contenu.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

export function routesPieces(config: Config & { SECRET_LIENS: string }): FastifyPluginAsyncZod {
  /**
   * Adresse à utiliser par le navigateur. Absolue quand l'adresse publique de l'API est connue
   * (téléversement direct, sans passer par le relais du site) ; sinon relative au site (/api/…).
   */
  const adresse = (chemin: string) => {
    const base = config.URL_API_PUBLIQUE ?? config.RENDER_EXTERNAL_URL;
    return { chemin, url: base ? `${base.replace(/\/+$/, "")}${chemin}` : null };
  };

  return async (app) => {
    const candidat = exigerRole("CANDIDAT");

    const dossierDe = async (request: FastifyRequest) => {
      const dossier = await app.prisma.dossier.findUnique({ where: { utilisateurId: utilisateurDe(request).id } });
      if (!dossier) throw erreurs.introuvable("Ton dossier");
      return dossier;
    };

    app.post(
      "/candidat/pieces/autorisation",
      {
        onRequest: candidat,
        schema: {
          tags: ["Justificatifs"],
          summary: "Obtenir un lien de dépôt (valable 15 minutes) pour une pièce",
          body: z.object({ type: schemaTypePiece, pieceId: z.string().uuid().optional() }),
          response: { 200: z.object({ chemin: z.string(), url: z.string().nullable() }) },
        },
      },
      async (request) => {
        const moi = utilisateurDe(request);
        const dossier = await dossierDe(request);
        const { type } = request.body;
        let pieceId = request.body.pieceId ?? null;
        if (pieceId) {
          const piece = await app.prisma.piece.findFirst({ where: { id: pieceId, dossierId: dossier.id } });
          if (!piece) throw erreurs.introuvable("Cette pièce");
          if (piece.etat === "VERIFIEE") throw erreurs.conflit("Cette pièce est déjà vérifiée. Contacte le cabinet pour la changer.");
        } else if (!TYPES_MULTIPLES.includes(type)) {
          const existante = await app.prisma.piece.findFirst({ where: { dossierId: dossier.id, type } });
          if (existante?.etat === "VERIFIEE") throw erreurs.conflit("Cette pièce est déjà vérifiée. Contacte le cabinet pour la changer.");
          pieceId = existante?.id ?? null;
        }
        const jeton = signer(config.SECRET_LIENS, { d: dossier.id, u: moi.id, t: type, p: pieceId } satisfies Autorisation, DUREE_AUTORISATION_S);
        return adresse(`/televersements?jeton=${jeton}`);
      },
    );

    // Téléversement direct : authentifié par le lien de dépôt signé, et non par le cookie.
    app.post(
      "/televersements",
      {
        config: { rateLimit: { max: 30, timeWindow: "10 minutes" } },
        schema: {
          tags: ["Justificatifs"],
          summary: "Déposer le fichier (JPG, PNG ou PDF, 10 Mo maximum) avec le lien de dépôt",
          querystring: z.object({ jeton: z.string().min(10) }),
          consumes: ["multipart/form-data"],
        },
      },
      async (request, reply) => {
        const autorisation = verifier<Autorisation>(config.SECRET_LIENS, request.query.jeton);
        if (!autorisation) throw new ErreurMetier(401, "NON_CONNECTE", "Le lien de dépôt a expiré. Recommence le dépôt.");
        const utilisateur = await app.prisma.utilisateur.findUnique({ where: { id: autorisation.u } });
        if (!utilisateur || utilisateur.etat !== "ACTIF") throw erreurs.accesRefuse();

        if (!request.isMultipart()) throw erreurs.invalide("Aucun fichier reçu.");
        const fichier = await request.file();
        if (!fichier) throw erreurs.invalide("Aucun fichier reçu.");
        const contenu = await fichier.toBuffer().catch((e: { code?: string }) => {
          if (e.code === "FST_REQ_FILE_TOO_LARGE") {
            throw new ErreurMetier(413, "DONNEES_INVALIDES", "Ce fichier est trop lourd : 10 Mo maximum.");
          }
          throw e;
        });
        if (contenu.length === 0) throw erreurs.invalide("Le fichier est vide.");
        if (contenu.length > TAILLE_MAX_FICHIER) throw new ErreurMetier(413, "DONNEES_INVALIDES", "Ce fichier est trop lourd : 10 Mo maximum.");
        const format = detecterFormat(contenu);
        if (!format) throw erreurs.invalide("Format non accepté : envoie une photo (JPG, PNG) ou un PDF.");
        const nomFichier = (fichier.filename || "document").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);

        const piece = await app.prisma.$transaction(async (tx) => {
          const nouveau = await tx.fichier.create({
            data: { contenu: new Uint8Array(contenu), typeMime: format, taille: contenu.length, empreinte: createHash("sha256").update(contenu).digest("hex") },
          });
          if (autorisation.p) {
            const ancienne = await tx.piece.findFirst({ where: { id: autorisation.p, dossierId: autorisation.d } });
            if (!ancienne) throw erreurs.introuvable("Cette pièce");
            if (ancienne.etat === "VERIFIEE") throw erreurs.conflit("Cette pièce est déjà vérifiée. Contacte le cabinet pour la changer.");
            // Redépôt : la pièce repasse « en attente » ; l'historique garde les refus.
            const maj = await tx.piece.update({
              where: { id: ancienne.id },
              data: { fichierId: nouveau.id, nomFichier, etat: "DEPOSEE", motifRefus: null, deposeLe: new Date() },
            });
            await tx.fichier.delete({ where: { id: ancienne.fichierId } });
            await tx.pieceEvenement.create({ data: { pieceId: maj.id, etat: "DEPOSEE", acteurId: autorisation.u } });
            return maj;
          }
          const creee = await tx.piece.create({
            data: { dossierId: autorisation.d, type: autorisation.t, fichierId: nouveau.id, nomFichier },
          });
          await tx.pieceEvenement.create({ data: { pieceId: creee.id, etat: "DEPOSEE", acteurId: autorisation.u } });
          return creee;
        });
        await journaliser(app.prisma, {
          acteurId: autorisation.u,
          role: "CANDIDAT",
          action: autorisation.p ? "PIECE_REDEPOSEE" : "PIECE_DEPOSEE",
          cibleType: "piece",
          cibleId: piece.id,
          details: { type: piece.type, taille: contenu.length },
          ip: request.ip,
        });
        return reply.code(201).send({
          piece: { id: piece.id, type: piece.type, etat: piece.etat, nomFichier: piece.nomFichier },
          message: `${LIBELLES_PIECES[piece.type]} bien reçu(e).`,
        });
      },
    );

    app.delete(
      "/candidat/pieces/:id",
      {
        onRequest: candidat,
        schema: { tags: ["Justificatifs"], summary: "Retirer une pièce non vérifiée", params: z.object({ id: z.string().uuid() }) },
      },
      async (request, reply) => {
        const dossier = await dossierDe(request);
        const piece = await app.prisma.piece.findFirst({ where: { id: request.params.id, dossierId: dossier.id } });
        if (!piece) throw erreurs.introuvable("Cette pièce");
        if (piece.etat === "VERIFIEE") throw erreurs.conflit("Cette pièce est déjà vérifiée. Contacte le cabinet pour la changer.");
        await app.prisma.$transaction([
          app.prisma.piece.delete({ where: { id: piece.id } }),
          app.prisma.fichier.delete({ where: { id: piece.fichierId } }),
        ]);
        await journaliser(app.prisma, { acteurId: utilisateurDe(request).id, role: "CANDIDAT", action: "PIECE_RETIREE", cibleType: "piece", cibleId: piece.id });
        return reply.code(204).send();
      },
    );

    app.get(
      "/candidat/pieces/:id/lien",
      {
        onRequest: candidat,
        schema: {
          tags: ["Justificatifs"],
          summary: "Lien temporaire (10 minutes) pour revoir une de mes pièces",
          params: z.object({ id: z.string().uuid() }),
          response: { 200: z.object({ chemin: z.string(), url: z.string().nullable() }) },
        },
      },
      async (request) => {
        const dossier = await dossierDe(request);
        const piece = await app.prisma.piece.findFirst({ where: { id: request.params.id, dossierId: dossier.id } });
        if (!piece) throw erreurs.introuvable("Cette pièce");
        return adresse(`/fichiers?jeton=${signer(config.SECRET_LIENS, { f: piece.fichierId }, DUREE_LIEN_FICHIER_S)}`);
      },
    );

    // Fichiers privés : accessibles uniquement par lien temporaire signé, jamais par une adresse fixe.
    app.get(
      "/fichiers",
      { schema: { tags: ["Justificatifs"], summary: "Ouvrir un fichier avec un lien temporaire", querystring: z.object({ jeton: z.string().min(10) }) } },
      async (request, reply) => {
        const lien = verifier<{ f: string }>(config.SECRET_LIENS, request.query.jeton);
        if (!lien) throw new ErreurMetier(403, "ACCES_REFUSE", "Ce lien a expiré. Rouvre le document depuis la plateforme.");
        const fichier = await app.prisma.fichier.findUnique({ where: { id: lien.f } });
        if (!fichier) throw erreurs.introuvable("Ce document");
        return reply
          .header("Content-Type", fichier.typeMime)
          .header("Content-Disposition", "inline")
          .header("Cache-Control", "private, no-store")
          .header("X-Content-Type-Options", "nosniff")
          .send(Buffer.from(fichier.contenu));
      },
    );
  };
}
