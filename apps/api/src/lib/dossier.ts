import {
  ETAPES,
  ETAPES_FORMULAIRE,
  SITUATIONS_AVEC_CONJOINT,
  type Etape,
  type EtapeFormulaire,
  type EtatEtape,
  type TypePiece,
} from "@bdt/shared";
import type { Prisma } from "@prisma/client";

/** Dossier tel que chargé pour le calcul des étapes. */
export const inclusionDossier = {
  experiences: { orderBy: { ordre: "asc" } },
  competences: { include: { competence: { include: { domaine: { select: { nom: true } } } } } },
  pieces: { orderBy: { deposeLe: "asc" }, include: { evenements: { orderBy: { id: "asc" } } } },
  diplome: { select: { nom: true } },
  testLangue: { select: { nom: true } },
  domaine: { select: { nom: true } },
} satisfies Prisma.DossierInclude;
export type DossierComplet = Prisma.DossierGetPayload<{ include: typeof inclusionDossier }>;

type Manques = Record<string, string>;
const OBLIGATOIRE = "Ce champ est obligatoire.";
const vide = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

function exiger(d: Record<string, unknown>, champs: string[], manques: Manques) {
  for (const c of champs) if (vide(d[c])) manques[c] = OBLIGATOIRE;
}

/**
 * Champs manquants pour qu'une étape soit complète. Vide = étape complète.
 * Les sections masquées par une réponse « Non » ne sont pas contrôlées.
 */
export function champsManquants(d: DossierComplet, etape: EtapeFormulaire): Manques {
  const m: Manques = {};
  const v = d as unknown as Record<string, unknown>;
  switch (etape) {
    case "PERSONNEL":
      exiger(v, ["nom", "prenoms", "dateNaissance", "sexe", "nationalite", "ville", "telephoneContact", "aPasseport"], m);
      if (d.languesParlees.length === 0) m.languesParlees = "Choisis au moins une langue.";
      if (d.aPasseport && !d.passeportExpiration) m.passeportExpiration = OBLIGATOIRE;
      break;
    case "DIPLOME":
      if (d.aDiplome === null) m.aDiplome = "Réponds à la question.";
      else if (d.aDiplome) exiger(v, ["diplomeId", "diplomeIntitule", "etablissement", "diplomeAnnee", "diplomePays"], m);
      break;
    case "LANGUES":
      if (d.aTestLangue === null) m.aTestLangue = "Réponds à la question.";
      else if (d.aTestLangue) exiger(v, ["testLangueId", "testScore", "testDate"], m);
      break;
    case "TRAVAIL":
      if (d.aTravaille === null) m.aTravaille = "Réponds à la question.";
      else if (d.aTravaille) {
        exiger(v, ["domaineId", "metier", "trancheExperience", "bureautique"], m);
        if (d.experiences.length === 0) m.experiences = "Ajoute au moins une expérience.";
      }
      break;
    case "FAMILLE":
      exiger(v, ["situation", "enfants", "partAvecAccompagnants"], m);
      if (d.situation && SITUATIONS_AVEC_CONJOINT.includes(d.situation)) {
        exiger(v, ["conjointNom", "conjointProfession", "conjointPasseport"], m);
      }
      if (d.partAvecAccompagnants && !d.nombreAccompagnants) m.nombreAccompagnants = OBLIGATOIRE;
      break;
  }
  return m;
}

/** Champs propres à chaque étape, pour savoir si une étape est « en cours ». */
const CHAMPS_ETAPE: Record<EtapeFormulaire, string[]> = {
  PERSONNEL: ["nom", "prenoms", "dateNaissance", "sexe", "nationalite", "ville", "telephoneContact", "emailContact", "aPasseport"],
  DIPLOME: ["aDiplome"],
  LANGUES: ["aTestLangue"],
  TRAVAIL: ["aTravaille"],
  FAMILLE: ["situation", "enfants", "partAvecAccompagnants"],
};

/** Pièces demandées selon les réponses : seules les pièces utiles (M4). */
export function piecesRequises(d: Pick<DossierComplet, "aDiplome" | "aTestLangue" | "aTravaille">): TypePiece[] {
  const types: TypePiece[] = ["IDENTITE"];
  if (d.aDiplome) types.push("DIPLOME");
  if (d.aTestLangue) types.push("ATTESTATION_LANGUE");
  if (d.aTravaille) types.push("CERTIFICAT_TRAVAIL");
  types.push("CV");
  return types;
}

/** Pièces requises sans fichier valable (aucune pièce déposée ou vérifiée de ce type). */
export function piecesManquantes(d: DossierComplet): TypePiece[] {
  return piecesRequises(d).filter(
    (type) => !d.pieces.some((p) => p.type === type && (p.etat === "DEPOSEE" || p.etat === "VERIFIEE")),
  );
}

export function etatEtape(d: DossierComplet, etape: Etape): EtatEtape {
  if (etape === "JUSTIFICATIFS") {
    const manquantes = piecesManquantes(d).length;
    if (manquantes === 0) return "TERMINE";
    return d.pieces.length > 0 ? "EN_COURS" : "A_FAIRE";
  }
  if (etape === "DIPLOME" && d.aDiplome === false) return "SAUTE";
  if (etape === "TRAVAIL" && d.aTravaille === false) return "SAUTE";
  if (Object.keys(champsManquants(d, etape)).length === 0) return "TERMINE";
  const v = d as unknown as Record<string, unknown>;
  const commence =
    CHAMPS_ETAPE[etape].some((c) => !vide(v[c])) || (etape === "PERSONNEL" && d.languesParlees.length > 0);
  return commence ? "EN_COURS" : "A_FAIRE";
}

export function sommaire(d: DossierComplet) {
  const etapes = ETAPES.map((etape) => ({ etape, etat: etatEtape(d, etape) }));
  const faites = etapes.filter((e) => e.etat === "TERMINE" || e.etat === "SAUTE").length;
  // Reprise : la dernière étape enregistrée si elle n'est pas finie, sinon la première étape à finir.
  const derniere = etapes.find((e) => e.etape === d.derniereEtape);
  const aReprendre =
    derniere && derniere.etat !== "TERMINE" && derniere.etat !== "SAUTE"
      ? derniere.etape
      : (etapes.find((e) => e.etat === "A_FAIRE" || e.etat === "EN_COURS")?.etape ?? null);
  const formulairesFinis = ETAPES_FORMULAIRE.every((e) => {
    const etat = etapes.find((x) => x.etape === e)?.etat;
    return etat === "TERMINE" || etat === "SAUTE";
  });
  return {
    etapes,
    progression: Math.round((faites / ETAPES.length) * 100),
    etapeReprise: aReprendre,
    pretAEnvoyer: formulairesFinis,
  };
}

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Dossier renvoyé au candidat lui-même (toutes ses informations). */
export function formaterDossier(d: DossierComplet) {
  return {
    id: d.id,
    statut: d.statut,
    envoyeLe: d.envoyeLe,
    consentementRecruteurs: d.consentementRecruteursLe !== null,
    nom: d.nom,
    prenoms: d.prenoms,
    dateNaissance: jour(d.dateNaissance),
    sexe: d.sexe,
    nationalite: d.nationalite,
    ville: d.ville,
    telephoneContact: d.telephoneContact,
    emailContact: d.emailContact,
    languesParlees: d.languesParlees,
    aPasseport: d.aPasseport,
    passeportExpiration: jour(d.passeportExpiration),
    aDiplome: d.aDiplome,
    diplomeId: d.diplomeId,
    diplome: d.diplome?.nom ?? null,
    diplomeIntitule: d.diplomeIntitule,
    filiere: d.filiere,
    etablissement: d.etablissement,
    diplomeAnnee: d.diplomeAnnee,
    diplomePays: d.diplomePays,
    aTestLangue: d.aTestLangue,
    testLangueId: d.testLangueId,
    testLangue: d.testLangue?.nom ?? null,
    testScore: d.testScore === null ? null : d.testScore.toNumber(),
    testDate: jour(d.testDate),
    aTravaille: d.aTravaille,
    domaineId: d.domaineId,
    domaine: d.domaine?.nom ?? null,
    metier: d.metier,
    trancheExperience: d.trancheExperience,
    bureautique: d.bureautique,
    experiences: d.experiences.map((e) => ({
      employeur: e.employeur,
      poste: e.poste,
      debut: e.debut,
      fin: e.fin,
      ville: e.ville,
    })),
    competences: d.competences.map((c) => ({
      id: c.competence.id,
      nom: c.competence.nom,
      domaine: c.competence.domaine.nom,
      statut: c.competence.statut,
    })),
    situation: d.situation,
    conjointNom: d.conjointNom,
    conjointProfession: d.conjointProfession,
    conjointPasseport: d.conjointPasseport,
    enfants: d.enfants,
    partAvecAccompagnants: d.partAvecAccompagnants,
    nombreAccompagnants: d.nombreAccompagnants,
  };
}

export function formaterPieces(d: DossierComplet) {
  const requises = piecesRequises(d);
  return {
    requises: requises.map((type) => ({
      type,
      manquante: piecesManquantes(d).includes(type),
    })),
    deposees: d.pieces.map((p) => ({
      id: p.id,
      type: p.type,
      etat: p.etat,
      motifRefus: p.motifRefus,
      nomFichier: p.nomFichier,
      deposeLe: p.deposeLe,
      // Pièce d'un type qui n'est plus demandé (ex. diplôme passé à « Non ») : gardée mais ignorée.
      ignoree: !requises.includes(p.type),
      refus: p.evenements.filter((e) => e.etat === "REFUSEE").map((e) => ({ motif: e.motif, le: e.creeLe })),
    })),
  };
}
