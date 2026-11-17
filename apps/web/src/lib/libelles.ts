"use client";

import {
  LIBELLES_ELEMENTS,
  LIBELLES_ETAPES,
  LIBELLES_ETATS_ELEMENT,
  LIBELLES_ETATS_ETAPE,
  LIBELLES_ETATS_SERVICE,
  LIBELLES_GRADES,
  LIBELLES_PIECES,
  type EtatElement,
  type EtatService,
  type Grade,
  type TypePiece,
} from "@bdt/shared";
import { useLangue } from "./preferences";

/**
 * Libellés en anglais de l'espace candidat. Les libellés français restent ceux de @bdt/shared
 * (une seule source) ; ici, seulement leur traduction.
 */
const EN = {
  grades: {
    A: "Job-ready",
    B: "Coaching missing",
    C: "Upskilling required",
    D: "Experience without a degree",
    HORS_BASSIN: "Outside the pool — to be guided",
  } as Record<Grade, string>,
  etapes: {
    PERSONNEL: "Personal information",
    DIPLOME: "Studies and degree",
    LANGUES: "Languages and language test",
    TRAVAIL: "Work experience",
    FAMILLE: "Family situation",
    JUSTIFICATIFS: "Supporting documents",
  } as Record<string, string>,
  etatsEtape: { A_FAIRE: "To do", EN_COURS: "In progress", TERMINE: "Done", SAUTE: "Skipped" } as Record<string, string>,
  elements: { DIPLOME: "Degree", TEST_LANGUE: "Language test", COACHING: "Coaching", NIVEAU: "Level in your field" } as Record<string, string>,
  etatsElement: { FAIT: "Done", EN_ATTENTE: "Awaiting verification", MANQUANT: "Missing" } as Record<EtatElement, string>,
  etatsService: { SUGGERE: "Suggested", INTERESSE: "Interested", ACCEPTE: "Accepted", EN_COURS: "In progress", REALISE: "Completed", ANNULE: "Cancelled" } as Record<EtatService, string>,
  pieces: {
    IDENTITE: "ID card or passport",
    DIPLOME: "Latest degree",
    ATTESTATION_LANGUE: "Language test certificate",
    CERTIFICAT_TRAVAIL: "Employment certificate",
    CV: "CV / résumé",
  } as Record<TypePiece, string>,
};

/** Explication courte d'un élément du grade, en anglais (les explications détaillées viennent de l'API, en français). */
const RAISONS_EN: Record<string, Record<EtatElement, string>> = {
  DIPLOME: { FAIT: "You have declared a degree.", EN_ATTENTE: "Your degree certificate is awaiting verification.", MANQUANT: "No degree declared." },
  TEST_LANGUE: {
    FAIT: "Your language test reaches the required score.",
    EN_ATTENTE: "Your language certificate is awaiting verification.",
    MANQUANT: "No language test with the required score yet.",
  },
  COACHING: { FAIT: "Coaching completed with the agency.", EN_ATTENTE: "Coaching is in progress.", MANQUANT: "Coaching with the agency is not done yet." },
  NIVEAU: { FAIT: "Your level in your field is sufficient.", EN_ATTENTE: "Your level will be assessed by the agency.", MANQUANT: "Your level in your field needs strengthening." },
};

export function useLibelles() {
  const { langue } = useLangue();
  const en = langue === "en";
  return {
    grade: (g: Grade) => (en ? EN.grades[g] : LIBELLES_GRADES[g].libelle),
    nomGrade: (g: Grade) => (g === "HORS_BASSIN" ? (en ? "Outside the pool" : "Hors bassin") : en ? `Grade ${g}` : `Grade ${g}`),
    etape: (e: string) => (en ? EN.etapes[e] : LIBELLES_ETAPES[e as keyof typeof LIBELLES_ETAPES]) ?? e,
    etatEtape: (e: string) => (en ? EN.etatsEtape[e] : LIBELLES_ETATS_ETAPE[e as keyof typeof LIBELLES_ETATS_ETAPE]) ?? e,
    element: (e: string) => (en ? EN.elements[e] : LIBELLES_ELEMENTS[e as keyof typeof LIBELLES_ELEMENTS]) ?? e,
    etatElement: (e: EtatElement) => (en ? EN.etatsElement[e] : LIBELLES_ETATS_ELEMENT[e]),
    etatService: (e: EtatService) => (en ? EN.etatsService[e] : LIBELLES_ETATS_SERVICE[e]),
    piece: (p: TypePiece) => (en ? EN.pieces[p] : LIBELLES_PIECES[p]),
    /** Raison d'un élément : celle de l'API en français, une phrase générique en anglais. */
    raison: (element: string, etat: EtatElement, raisonFr: string) => (en ? (RAISONS_EN[element]?.[etat] ?? raisonFr) : raisonFr),
  };
}
