"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Langue = "fr" | "en";

interface Preferences {
  langue: Langue;
  setLangue: (l: Langue) => void;
  /** Texte dans la langue choisie : tr("Bonjour", "Hello"). */
  tr: (fr: string, en: string) => string;
  sombre: boolean;
  basculerSombre: () => void;
}

const CLE_LANGUE = "bdt-langue";
const CLE_SOMBRE = "bdt-sombre";

// Le stockage du navigateur peut être indisponible (navigation privée) : les préférences restent alors en mémoire.
const lire = (cle: string) => {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle: string, valeur: string) => {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    /* rien */
  }
};

const Contexte = createContext<Preferences | null>(null);

/**
 * Langue (français par défaut, anglais au choix) et mode sombre, mémorisés sur l'appareil.
 * Le mode sombre ne s'applique qu'à l'espace candidat (voir `ZoneSombre`).
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [langue, setLangueEtat] = useState<Langue>("fr");
  const [sombre, setSombre] = useState(false);

  useEffect(() => {
    const l = lire(CLE_LANGUE);
    if (l === "en" || l === "fr") setLangueEtat(l);
    const s = lire(CLE_SOMBRE);
    if (s !== null) setSombre(s === "1");
  }, []);

  useEffect(() => {
    document.documentElement.lang = langue;
  }, [langue]);

  const setLangue = useCallback((l: Langue) => {
    setLangueEtat(l);
    ecrire(CLE_LANGUE, l);
  }, []);
  const basculerSombre = useCallback(() => {
    setSombre((s) => {
      ecrire(CLE_SOMBRE, s ? "0" : "1");
      return !s;
    });
  }, []);
  const tr = useCallback((fr: string, en: string) => (langue === "en" ? en : fr), [langue]);

  const valeur = useMemo(() => ({ langue, setLangue, tr, sombre, basculerSombre }), [langue, setLangue, tr, sombre, basculerSombre]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function usePreferences(): Preferences {
  const p = useContext(Contexte);
  if (!p) throw new Error("PreferencesProvider manquant");
  return p;
}

/** Raccourci : la fonction de traduction et la langue. */
export function useLangue() {
  const { langue, setLangue, tr } = usePreferences();
  return { langue, setLangue, tr };
}

/** Format de date selon la langue. */
export function formatDate(v: string | Date, langue: Langue, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Date(v).toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR", options);
}
