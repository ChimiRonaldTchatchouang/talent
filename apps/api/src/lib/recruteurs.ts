import { LIBELLES_TRANCHES, type TrancheExperience } from "@bdt/shared";
import type { AccesRecruteur, Prisma, PrismaClient } from "@prisma/client";
import type { Config } from "./config.js";
import { envoyerAuxAdmins } from "./emails.js";
import { parametresEnVigueur } from "./parametres.js";

const aujourdHui = () => new Date(new Date().toISOString().slice(0, 10));

/** Un accès est ouvert jusqu'à sa date de fin incluse (R-16, T11). */
export function accesOuvert(acces: Pick<AccesRecruteur, "dateFin">): boolean {
  return acces.dateFin >= aujourdHui();
}

/**
 * R-14 : un recruteur ne voit que les profils envoyés, au grade confirmé (ou corrigé), dans son
 * périmètre (grades et domaines), dont le candidat a accepté d'être présenté aux recruteurs.
 */
export function perimetre(
  acces: Pick<AccesRecruteur, "gradesVisibles" | "domainesVisibles">,
  demo = false,
): Prisma.DossierWhereInput {
  return {
    statut: "ENVOYE",
    consentementRecruteursLe: { not: null },
    // Un vrai recruteur ne voit jamais les profils de démonstration, et inversement.
    utilisateur: { etat: "ACTIF", estDemo: demo },
    grade: { etat: { in: ["CONFIRME", "CORRIGE"] }, grade: { in: acces.gradesVisibles } },
    ...(acces.domainesVisibles.length ? { aTravaille: true, domaineId: { in: acces.domainesVisibles } } : {}),
  };
}

export const inclusionProfil = {
  grade: { select: { grade: true, elementsFaits: true } },
  domaine: { select: { nom: true } },
  diplome: { select: { nom: true } },
  testLangue: { select: { nom: true } },
  competences: { where: { competence: { statut: "VALIDEE" } }, select: { competence: { select: { nom: true } } } },
  pieces: { where: { etat: "VERIFIEE" }, select: { type: true } },
} satisfies Prisma.DossierInclude;
type DossierProfil = Prisma.DossierGetPayload<{ include: typeof inclusionProfil }>;

/**
 * Profil anonymisé (M9, section 8.3). Ne contient JAMAIS : téléphone, e-mail, adresse, ville,
 * date de naissance, nom de famille complet, conjoint, enfants, fichiers.
 * Liste blanche : seuls les champs ci-dessous sortent de la base vers le recruteur.
 */
export function profilAnonyme(d: DossierProfil) {
  const prenom = (d.prenoms ?? "").trim().split(/\s+/)[0] || "Candidat";
  const initiale = d.nom?.trim()[0]?.toUpperCase();
  const faits = d.grade?.elementsFaits ?? [];
  return {
    id: d.id,
    nom: initiale ? `${prenom} ${initiale}.` : prenom,
    grade: d.grade?.grade ?? null,
    metier: d.aTravaille ? d.metier : null,
    domaine: d.aTravaille ? (d.domaine?.nom ?? null) : null,
    experience: d.aTravaille && d.trancheExperience ? LIBELLES_TRANCHES[d.trancheExperience as TrancheExperience] : null,
    niveauDiplome: d.aDiplome ? (d.diplome?.nom ?? null) : null,
    competences: d.aTravaille ? d.competences.map((c) => c.competence.nom) : [],
    langues: d.languesParlees,
    testLangue: d.aTestLangue && d.testLangue ? { nom: d.testLangue.nom, score: d.testScore?.toNumber() ?? null } : null,
    badges: {
      diplomeVerifie: d.aDiplome === true && d.pieces.some((p) => p.type === "DIPLOME"),
      testVerifie: faits.includes("TEST_LANGUE"),
      coache: faits.includes("COACHING"),
      passeportValide: d.aPasseport === true && !!d.passeportExpiration && d.passeportExpiration >= aujourdHui(),
    },
  };
}
export type ProfilAnonyme = ReturnType<typeof profilAnonyme>;

/** M10 : prévient les administrateurs quand un accès recruteur expire dans N jours (paramétrable). Une fois par accès. */
export async function alerterFinsAcces(db: PrismaClient, config: Config): Promise<number> {
  const { joursAlerteFinAccesRecruteur: jours } = (await parametresEnVigueur(db)).valeurs;
  const limite = new Date(aujourdHui().getTime() + jours * 86400000);
  const acces = await db.accesRecruteur.findMany({
    where: { alerteFinEnvoyee: false, dateFin: { gte: aujourdHui(), lte: limite } },
    include: { utilisateur: { select: { nom: true, etat: true } } },
  });
  for (const a of acces) {
    if (a.utilisateur.etat !== "ACTIF") continue;
    await envoyerAuxAdmins(db, config, {
      sujet: `Accès recruteur bientôt expiré : ${a.entreprise}`,
      texte:
        `Bonjour,\n\nL'accès de ${a.utilisateur.nom ?? "ce recruteur"} (${a.entreprise}, ${a.pays}) se termine le ` +
        `${a.dateFin.toLocaleDateString("fr-FR", { timeZone: "UTC" })}.\nVous pouvez le prolonger depuis la plateforme :\n` +
        `${config.URL_SITE.replace(/\/+$/, "")}/admin/recruteurs`,
    });
    await db.accesRecruteur.update({ where: { id: a.id }, data: { alerteFinEnvoyee: true } });
  }
  return acces.length;
}
