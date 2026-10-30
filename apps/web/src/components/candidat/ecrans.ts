import {
  LANGUES_PARLEES,
  LIBELLES_BUREAUTIQUE,
  LIBELLES_ENFANTS,
  LIBELLES_SEXES,
  LIBELLES_SITUATIONS,
  LIBELLES_TRANCHES,
} from "@bdt/shared";
import type { Dossier, ListesReference } from "@/lib/types";

export type Valeurs = Record<string, unknown>;
export interface Option {
  valeur: string;
  libelle: string;
  aide?: string;
}

interface Base {
  cle: string;
  libelle: string;
  aide?: string;
  facultatif?: boolean;
  visible?: (v: Valeurs) => boolean;
}
export type Champ =
  | (Base & { type: "texte" | "date" | "mois" | "tel" | "email"; placeholder?: string })
  | (Base & { type: "nombre"; entier?: boolean; placeholder?: string })
  | (Base & { type: "choix"; options: Option[] })
  | (Base & { type: "liste"; options: (l: ListesReference, d: Dossier) => Option[] })
  | (Base & { type: "multi"; options: string[] })
  | (Base & { type: "ouiNon" })
  | (Base & { type: "experiences" })
  | (Base & { type: "competences" });

export interface Ecran {
  titre: string;
  aide?: string;
  champs: Champ[];
  visible?: (v: Valeurs) => boolean;
}

const options = (libelles: Record<string, string>): Option[] => Object.entries(libelles).map(([valeur, libelle]) => ({ valeur, libelle }));

/** Élément actif de la liste, plus l'élément déjà choisi s'il a été désactivé depuis. */
function avecChoixActuel(elements: { id: string; nom: string }[], actuel: string | null, nomActuel: string | null): Option[] {
  const opts = elements.map((e) => ({ valeur: e.id, libelle: e.nom }));
  if (actuel && !opts.some((o) => o.valeur === actuel)) opts.push({ valeur: actuel, libelle: nomActuel ?? "Choix actuel" });
  return opts;
}

/**
 * Écrans de chaque étape : une question ou un petit groupe de questions par écran (M3).
 * Les écrans qui suivent une question filtre ne s'affichent que si la réponse est « Oui ».
 */
export const ECRANS: Record<"PERSONNEL" | "DIPLOME" | "LANGUES" | "TRAVAIL" | "FAMILLE", Ecran[]> = {
  PERSONNEL: [
    {
      titre: "Comment t'appelles-tu ?",
      champs: [
        { type: "texte", cle: "nom", libelle: "Nom" },
        { type: "texte", cle: "prenoms", libelle: "Prénom(s)" },
      ],
    },
    {
      titre: "Parle-nous un peu de toi",
      champs: [
        { type: "date", cle: "dateNaissance", libelle: "Date de naissance" },
        { type: "choix", cle: "sexe", libelle: "Sexe", options: options(LIBELLES_SEXES) },
        { type: "texte", cle: "nationalite", libelle: "Nationalité", placeholder: "Camerounaise" },
      ],
    },
    {
      titre: "Où peut-on te joindre ?",
      champs: [
        { type: "texte", cle: "ville", libelle: "Ville de résidence", placeholder: "Douala" },
        { type: "tel", cle: "telephoneContact", libelle: "Téléphone", placeholder: "6 99 12 34 56" },
        { type: "email", cle: "emailContact", libelle: "E-mail", facultatif: true },
      ],
    },
    {
      titre: "Quelles langues parles-tu ?",
      aide: "Choisis toutes les langues que tu parles.",
      champs: [{ type: "multi", cle: "languesParlees", libelle: "Langues parlées", options: [...LANGUES_PARLEES] }],
    },
    {
      titre: "As-tu un passeport ?",
      champs: [
        { type: "ouiNon", cle: "aPasseport", libelle: "As-tu un passeport ?" },
        { type: "date", cle: "passeportExpiration", libelle: "Date d'expiration du passeport", visible: (v) => v.aPasseport === true },
      ],
    },
  ],
  DIPLOME: [
    { titre: "As-tu un diplôme ?", champs: [{ type: "ouiNon", cle: "aDiplome", libelle: "As-tu un diplôme ?" }] },
    {
      titre: "Ton dernier diplôme",
      visible: (v) => v.aDiplome === true,
      champs: [
        { type: "liste", cle: "diplomeId", libelle: "Niveau", options: (l, d) => avecChoixActuel(l.diplomes, d.diplomeId, d.diplome) },
        { type: "texte", cle: "diplomeIntitule", libelle: "Intitulé du diplôme", placeholder: "BTS Génie civil" },
        { type: "texte", cle: "filiere", libelle: "Filière ou spécialité", facultatif: true },
      ],
    },
    {
      titre: "Où l'as-tu obtenu ?",
      visible: (v) => v.aDiplome === true,
      champs: [
        { type: "texte", cle: "etablissement", libelle: "Établissement" },
        { type: "nombre", entier: true, cle: "diplomeAnnee", libelle: "Année d'obtention", placeholder: "2020" },
        { type: "texte", cle: "diplomePays", libelle: "Pays", placeholder: "Cameroun" },
      ],
    },
  ],
  LANGUES: [
    {
      titre: "As-tu passé un test de langue ?",
      aide: "Par exemple TCF, TEF, IELTS ou TOEFL.",
      champs: [{ type: "ouiNon", cle: "aTestLangue", libelle: "As-tu passé un test de langue ?" }],
    },
    {
      titre: "Ton test de langue",
      visible: (v) => v.aTestLangue === true,
      champs: [
        { type: "liste", cle: "testLangueId", libelle: "Test", options: (l, d) => avecChoixActuel(l.testsLangue, d.testLangueId, d.testLangue) },
        { type: "nombre", cle: "testScore", libelle: "Score obtenu" },
        { type: "date", cle: "testDate", libelle: "Date du test" },
      ],
    },
  ],
  TRAVAIL: [
    { titre: "As-tu déjà travaillé ?", champs: [{ type: "ouiNon", cle: "aTravaille", libelle: "As-tu déjà travaillé ?" }] },
    {
      titre: "Ton métier",
      visible: (v) => v.aTravaille === true,
      champs: [
        { type: "liste", cle: "domaineId", libelle: "Domaine principal", options: (l, d) => avecChoixActuel(l.domaines, d.domaineId, d.domaine) },
        { type: "texte", cle: "metier", libelle: "Métier", placeholder: "Électricien bâtiment" },
        { type: "choix", cle: "trancheExperience", libelle: "Années d'expérience", options: options(LIBELLES_TRANCHES) },
      ],
    },
    {
      titre: "Tes expériences",
      aide: "Ajoute tes emplois, du plus récent au plus ancien.",
      visible: (v) => v.aTravaille === true,
      champs: [{ type: "experiences", cle: "experiences", libelle: "Expériences" }],
    },
    {
      titre: "Tes compétences",
      aide: "Choisis tes compétences. Si une compétence manque, propose-la : le cabinet la validera.",
      visible: (v) => v.aTravaille === true,
      champs: [{ type: "competences", cle: "competenceIds", libelle: "Compétences", facultatif: true }],
    },
    {
      titre: "Ton niveau en bureautique",
      aide: "Word, Excel, e-mails, Internet…",
      visible: (v) => v.aTravaille === true,
      champs: [
        {
          type: "choix",
          cle: "bureautique",
          libelle: "Niveau en bureautique",
          options: [
            { valeur: "DEBUTANT", libelle: LIBELLES_BUREAUTIQUE.DEBUTANT, aide: "Je m'en sers rarement." },
            { valeur: "MOYEN", libelle: LIBELLES_BUREAUTIQUE.MOYEN, aide: "Je sais écrire un texte et envoyer un e-mail." },
            { valeur: "BON", libelle: LIBELLES_BUREAUTIQUE.BON, aide: "Je suis à l'aise avec Word, Excel et Internet." },
          ],
        },
      ],
    },
  ],
  FAMILLE: [
    {
      titre: "Ta situation familiale",
      champs: [
        { type: "choix", cle: "situation", libelle: "Situation", options: options(LIBELLES_SITUATIONS) },
        { type: "texte", cle: "conjointNom", libelle: "Nom du conjoint", visible: (v) => v.situation === "MARIE" || v.situation === "UNION_LIBRE" },
        {
          type: "texte",
          cle: "conjointProfession",
          libelle: "Profession du conjoint",
          visible: (v) => v.situation === "MARIE" || v.situation === "UNION_LIBRE",
        },
        {
          type: "ouiNon",
          cle: "conjointPasseport",
          libelle: "Ton conjoint a-t-il un passeport ?",
          visible: (v) => v.situation === "MARIE" || v.situation === "UNION_LIBRE",
        },
      ],
    },
    { titre: "Combien d'enfants as-tu ?", champs: [{ type: "choix", cle: "enfants", libelle: "Nombre d'enfants", options: options(LIBELLES_ENFANTS) }] },
    {
      titre: "Partirais-tu avec quelqu'un ?",
      aide: "Des personnes qui partiraient avec toi (conjoint, enfants…).",
      champs: [
        { type: "ouiNon", cle: "partAvecAccompagnants", libelle: "Des personnes partiraient-elles avec toi ?" },
        { type: "nombre", entier: true, cle: "nombreAccompagnants", libelle: "Combien de personnes ?", visible: (v) => v.partAvecAccompagnants === true },
      ],
    },
  ],
};

/** Valeurs de départ du formulaire, à partir du dossier enregistré. */
export function valeursInitiales(d: Dossier): Valeurs {
  return {
    ...d,
    competenceIds: d.competences.map((c) => c.id),
    experiences: d.experiences,
  };
}

/** Toutes les clés enregistrées par une étape. */
export function clesEtape(etape: keyof typeof ECRANS): string[] {
  return ECRANS[etape].flatMap((e) => e.champs.map((c) => c.cle));
}
