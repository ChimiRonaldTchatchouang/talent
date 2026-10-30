"use client";

import type { EtapeId } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { ListesReference, ReponseDossier } from "./types";

/** Ordre du parcours et adresse de chaque étape. */
export const PARCOURS: EtapeId[] = ["PERSONNEL", "DIPLOME", "LANGUES", "TRAVAIL", "FAMILLE", "JUSTIFICATIFS"];
export function adresseEtape(etape: EtapeId | null): string {
  if (!etape) return "/candidat/recapitulatif";
  return etape === "JUSTIFICATIFS" ? "/candidat/justificatifs" : `/candidat/etape/${etape.toLowerCase()}`;
}
export function etapeSuivante(etape: EtapeId): EtapeId | null {
  return PARCOURS[PARCOURS.indexOf(etape) + 1] ?? null;
}

/** Charge le dossier du candidat connecté (et, au besoin, les listes de référence). */
export function useDossier(avecListes = false) {
  const [reponse, setReponse] = useState<ReponseDossier | null>(null);
  const [listes, setListes] = useState<ListesReference | null>(null);
  const [erreur, setErreur] = useState<unknown>(null);

  const recharger = useCallback(async () => {
    try {
      setReponse(await api<ReponseDossier>("/candidat/dossier"));
    } catch (e) {
      setErreur(e);
    }
  }, []);

  useEffect(() => {
    void recharger();
    if (avecListes) api<ListesReference>("/referentiels").then(setListes).catch(setErreur);
  }, [recharger, avecListes]);

  return { reponse, setReponse, listes, erreur, recharger };
}
