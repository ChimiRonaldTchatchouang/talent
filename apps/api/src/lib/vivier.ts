import {
  ETATS_JUSTIFICATIFS,
  GRADES,
  LIBELLES_ELEMENTS,
  TRANCHES_EXPERIENCE,
  type ElementGrade,
  type EtatJustificatifs,
} from "@bdt/shared";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { piecesRequises } from "./dossier.js";

const liste = <T extends readonly [string, ...string[]]>(valeurs: T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(z.enum(valeurs)));
const oui = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");

/** Filtres combinables du vivier (M7, W7). Tous facultatifs. */
export const schemaFiltres = z.object({
  grades: liste(GRADES),
  etatGrade: z.enum(["PROVISOIRE", "CONFIRME", "CORRIGE"]).optional(),
  alerte: oui,
  domaineId: z.string().uuid().optional(),
  competenceIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(z.string().uuid())),
  ville: z.string().trim().max(80).optional(),
  langue: z.string().trim().max(40).optional(),
  testValide: oui,
  passeportValide: oui,
  tranches: liste(TRANCHES_EXPERIENCE),
  justificatifs: z.enum(ETATS_JUSTIFICATIFS).optional(),
  q: z.string().trim().max(80).optional(),
});
export type Filtres = z.infer<typeof schemaFiltres>;

const inclusion = {
  grade: true,
  domaine: { select: { nom: true } },
  pieces: { select: { type: true, etat: true } },
  competences: { select: { competenceId: true } },
} satisfies Prisma.DossierInclude;
type DossierVivier = Prisma.DossierGetPayload<{ include: typeof inclusion }>;

function etatJustificatifs(d: DossierVivier): EtatJustificatifs[] {
  const requises = piecesRequises(d);
  const etats: EtatJustificatifs[] = [];
  const valables = (t: string) => d.pieces.some((p) => p.type === t && p.etat !== "REFUSEE");
  etats.push(requises.every(valables) ? "COMPLETS" : "INCOMPLETS");
  if (d.pieces.some((p) => p.etat === "DEPOSEE" && requises.includes(p.type))) etats.push("A_VERIFIER");
  if (d.pieces.some((p) => p.etat === "REFUSEE" && requises.includes(p.type))) etats.push("REFUSES");
  return etats;
}

const aujourdHui = () => new Date(new Date().toISOString().slice(0, 10));

/** Résumé d'un candidat pour les listes et les colonnes du classement. */
export function resume(d: DossierVivier) {
  const nomComplet = [d.prenoms, d.nom].filter(Boolean).join(" ") || "Sans nom";
  const initiales = [d.prenoms?.[0], d.nom?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const requises = piecesRequises(d);
  return {
    id: d.id,
    nomComplet,
    initiales,
    metier: d.aTravaille ? d.metier : null,
    domaine: d.aTravaille ? (d.domaine?.nom ?? null) : null,
    ville: d.ville,
    telephone: d.telephoneContact,
    grade: d.grade?.grade ?? null,
    etatGrade: d.grade?.etat ?? null,
    alerte: d.grade?.alerte ?? false,
    manques: (["DIPLOME", "TEST_LANGUE", "COACHING", "NIVEAU"] as ElementGrade[])
      .filter((e) => d.grade && !d.grade.elementsAcquis.includes(e))
      .map((e) => LIBELLES_ELEMENTS[e]),
    piecesAVerifier: d.pieces.filter((p) => p.etat === "DEPOSEE" && requises.includes(p.type)).length,
    piecesManquantes: requises.filter((t) => !d.pieces.some((p) => p.type === t && p.etat !== "REFUSEE")).length,
    justificatifs: etatJustificatifs(d),
    passeportValide: d.aPasseport === true && !!d.passeportExpiration && d.passeportExpiration >= aujourdHui(),
    envoyeLe: d.envoyeLe,
  };
}
export type ResumeCandidat = ReturnType<typeof resume>;

/** Candidats du vivier correspondant aux filtres : dossiers envoyés uniquement (R-10), du plus récent au plus ancien. */
export async function rechercherVivier(db: PrismaClient, f: Filtres): Promise<ResumeCandidat[]> {
  const et: Prisma.DossierWhereInput[] = [{ statut: "ENVOYE" }];
  if (f.grades.length) et.push({ grade: { grade: { in: f.grades } } });
  if (f.etatGrade) et.push({ grade: { etat: f.etatGrade } });
  if (f.alerte) et.push({ grade: { alerte: true } });
  if (f.domaineId) et.push({ aTravaille: true, domaineId: f.domaineId });
  if (f.ville) et.push({ ville: { contains: f.ville, mode: "insensitive" } });
  if (f.langue) et.push({ languesParlees: { has: f.langue } });
  if (f.testValide) et.push({ grade: { elementsFaits: { has: "TEST_LANGUE" } } });
  if (f.passeportValide) et.push({ aPasseport: true, passeportExpiration: { gte: aujourdHui() } });
  if (f.tranches.length) et.push({ aTravaille: true, trancheExperience: { in: f.tranches } });
  if (f.q) {
    const chiffres = f.q.replace(/\D/g, "");
    et.push({
      OR: [
        { nom: { contains: f.q, mode: "insensitive" } },
        { prenoms: { contains: f.q, mode: "insensitive" } },
        ...(chiffres.length >= 4
          ? [{ telephoneContact: { contains: chiffres } }, { utilisateur: { telephone: { contains: chiffres } } }]
          : []),
      ],
    });
  }
  // Compétences : le candidat doit avoir toutes les compétences choisies (validées uniquement, W7).
  for (const id of f.competenceIds) et.push({ competences: { some: { competenceId: id, competence: { statut: "VALIDEE" } } } });

  const dossiers = await db.dossier.findMany({ where: { AND: et }, include: inclusion, orderBy: { envoyeLe: "desc" } });
  return dossiers.map(resume).filter((r) => !f.justificatifs || r.justificatifs.includes(f.justificatifs));
}

/** Échappe une valeur pour un fichier CSV (séparateur « ; », lisible par Excel en français). */
function cellule(v: unknown): string {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  // Neutralise les formules (=, +, -, @) qu'Excel exécuterait à l'ouverture.
  const sur = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(sur) ? `"${sur.replace(/"/g, '""')}"` : sur;
}

/** Export de la liste filtrée (sans les pièces). BOM UTF-8 pour qu'Excel affiche les accents. */
export function versCsv(lignes: ResumeCandidat[]): string {
  const entetes = ["Nom", "Grade", "État du grade", "Métier", "Domaine", "Ville", "Téléphone", "Passeport valide", "Ce qui manque", "Pièces manquantes", "Pièces à vérifier", "Envoyé le"];
  const corps = lignes.map((r) =>
    [
      r.nomComplet,
      r.grade === "HORS_BASSIN" ? "Hors bassin" : r.grade,
      r.etatGrade === "PROVISOIRE" ? "Provisoire" : r.etatGrade === "CONFIRME" ? "Confirmé" : r.etatGrade === "CORRIGE" ? "Corrigé" : "",
      r.metier,
      r.domaine,
      r.ville,
      r.telephone,
      r.passeportValide ? "Oui" : "Non",
      r.manques.join(", "),
      r.piecesManquantes,
      r.piecesAVerifier,
      r.envoyeLe,
    ]
      .map(cellule)
      .join(";"),
  );
  return "﻿" + [entetes.join(";"), ...corps].join("\r\n");
}
