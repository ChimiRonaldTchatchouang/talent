// Tests du moteur de classement (section 9). Fonctions pures : aucune base de données.
import { PARAMETRES_CLASSEMENT_PAR_DEFAUT as P } from "@bdt/shared";
import { describe, expect, it } from "vitest";
import { classer, meilleurEtat, piecesNonVerifieesPourA, type EntreeClassement } from "../src/classement/moteur.js";

/** Dossier de base : diplôme, test au-dessus du minimum, bureautique « Bon », 6-10 ans d'expérience. */
const complet = (surcharges: Partial<EntreeClassement> = {}): EntreeClassement => ({
  aDiplome: true,
  aTravaille: true,
  trancheExperience: "ANS_6_10",
  bureautique: "BON",
  aTestLangue: true,
  testScore: 450,
  testScoreMinimum: 400,
  pieces: {},
  servicesRealises: [],
  niveauEvalue: "NON_EVALUE",
  ...surcharges,
});
const etat = (r: ReturnType<typeof classer>, element: string) => r.elements.find((e) => e.element === element)!;

describe("Moteur de classement — cas de la spécification", () => {
  it("T1 — diplôme, test ≥ minimum, coaching réalisé, niveau suffisant : A", () => {
    const r = classer(complet({ servicesRealises: ["COACHING"], niveauEvalue: "SUFFISANT" }), P);
    expect(r.grade).toBe("A");
    expect(r.regle).toBe("R-01");
    expect(r.suggestions).toEqual([]);
  });

  it("T2 — même dossier sans coaching : B, seul le coaching est suggéré", () => {
    const r = classer(complet({ niveauEvalue: "SUFFISANT" }), P);
    expect(r.grade).toBe("B");
    expect(r.suggestions).toEqual(["COACHING"]);
  });

  it("T3 — diplôme, pas de test, pas de coaching, niveau insuffisant : C avec 3 services suggérés", () => {
    const r = classer(complet({ aTestLangue: false, niveauEvalue: "INSUFFISANT" }), P);
    expect(r.grade).toBe("C");
    expect(r.suggestions.sort()).toEqual(["COACHING", "NIVEAU", "TEST_LANGUE"]);
  });

  it("T4 — test sous le minimum, coaching fait, niveau suffisant : C, service « test de langue » suggéré", () => {
    const r = classer(complet({ testScore: 350, servicesRealises: ["COACHING"], niveauEvalue: "SUFFISANT" }), P);
    expect(r.grade).toBe("C");
    expect(r.suggestions).toEqual(["TEST_LANGUE"]);
    expect(etat(r, "TEST_LANGUE").raison).toContain("400");
  });

  it("T5 — pas de diplôme, 12 ans d'expérience : D, test de langue et coaching suggérés", () => {
    const r = classer(complet({ aDiplome: false, trancheExperience: "ANS_10_PLUS" }), P);
    expect(r.grade).toBe("D");
    // Le test déclaré (450 ≥ 400) est acquis : seul le coaching reste suggéré parmi les services du grade D.
    expect(r.suggestions).toEqual(["COACHING"]);
    expect(classer(complet({ aDiplome: false, aTestLangue: false }), P).suggestions).toEqual(["TEST_LANGUE", "COACHING"]);
    expect(etat(r, "DIPLOME").etat).toBe("MANQUANT");
  });

  it("T6 — ni diplôme ni expérience : hors bassin, à orienter", () => {
    const r = classer(complet({ aDiplome: false, aTravaille: false }), P);
    expect(r.grade).toBe("HORS_BASSIN");
    expect(r.regle).toBe("R-03");
  });

  it("T7 — grade C, test et mise à niveau marqués réalisés : B, seul le coaching suggéré", () => {
    const avant = classer(complet({ aTestLangue: false, bureautique: "MOYEN" }), P);
    expect(avant.grade).toBe("C");
    const apres = classer(complet({ aTestLangue: false, bureautique: "MOYEN", servicesRealises: ["TEST_LANGUE", "NIVEAU"] }), P);
    expect(apres.grade).toBe("B");
    expect(apres.suggestions).toEqual(["COACHING"]);
  });

  it("T8 — le coaching n'est jamais acquis tant que l'administrateur ne l'a pas marqué réalisé", () => {
    const r = classer(complet({ niveauEvalue: "SUFFISANT" }), P);
    expect(etat(r, "COACHING")).toMatchObject({ etat: "MANQUANT", acquis: false });
  });
});

describe("Moteur de classement — règles détaillées", () => {
  it("niveau provisoire : bureautique « Bon » et 3 ans minimum (seuils paramétrables)", () => {
    expect(etat(classer(complet({ trancheExperience: "ANS_3_5" }), P), "NIVEAU").acquis).toBe(true);
    expect(etat(classer(complet({ trancheExperience: "ANS_0_2" }), P), "NIVEAU").acquis).toBe(false);
    expect(etat(classer(complet({ bureautique: "MOYEN" }), P), "NIVEAU").acquis).toBe(false);
    // Seuils modifiés : bureautique « Moyen » suffit, mais 10 ans exigés.
    const p2 = { ...P, bureautiqueMinimum: "MOYEN" as const, experienceMinimumAnnees: 10 };
    expect(etat(classer(complet({ bureautique: "MOYEN" }), p2), "NIVEAU").acquis).toBe(false);
    expect(etat(classer(complet({ bureautique: "MOYEN", trancheExperience: "ANS_10_PLUS" }), p2), "NIVEAU").acquis).toBe(true);
  });

  it("l'évaluation du cabinet l'emporte sur le calcul provisoire", () => {
    expect(etat(classer(complet({ niveauEvalue: "INSUFFISANT" }), P), "NIVEAU").acquis).toBe(false);
    expect(etat(classer(complet({ aTravaille: false, niveauEvalue: "SUFFISANT" }), P), "NIVEAU").etat).toBe("FAIT");
  });

  it("une section masquée (« Non ») est ignorée même si des réponses restent en mémoire", () => {
    const r = classer(complet({ aTravaille: false }), P);
    expect(etat(r, "NIVEAU").acquis).toBe(false);
  });

  it("W5 — diplôme refusé : élément « en attente », le grade ne peut plus être A", () => {
    const r = classer(complet({ servicesRealises: ["COACHING"], niveauEvalue: "SUFFISANT", pieces: { DIPLOME: "REFUSEE" } }), P);
    expect(etat(r, "DIPLOME").etat).toBe("EN_ATTENTE");
    expect(r.grade).not.toBe("A");
  });

  it("W5 — attestation vérifiée mais score sous le minimum : le test reste manquant", () => {
    const r = classer(complet({ testScore: 300, pieces: { ATTESTATION_LANGUE: "VERIFIEE" } }), P);
    expect(etat(r, "TEST_LANGUE").etat).toBe("MANQUANT");
  });

  it("test « Autre » sans minimum : en attente du cabinet, acquis une fois l'attestation vérifiée", () => {
    expect(etat(classer(complet({ testScoreMinimum: null }), P), "TEST_LANGUE")).toMatchObject({ etat: "EN_ATTENTE", acquis: false });
    expect(etat(classer(complet({ testScoreMinimum: null, pieces: { ATTESTATION_LANGUE: "VERIFIEE" } }), P), "TEST_LANGUE").acquis).toBe(true);
  });

  it("R-13 — services du grade D paramétrables", () => {
    const r = classer(complet({ aDiplome: false }), { ...P, elementsSuggeresGradeD: ["COACHING"] });
    expect(r.suggestions).toEqual(["COACHING"]);
  });

  it("éléments vérifiés : « Fait » ; déclarés mais non vérifiés : « En attente de vérification »", () => {
    const r = classer(complet({ pieces: { DIPLOME: "VERIFIEE" } }), P);
    expect(etat(r, "DIPLOME").etat).toBe("FAIT");
    expect(etat(r, "TEST_LANGUE").etat).toBe("EN_ATTENTE");
  });

  it("R-08 — pièces à vérifier avant de confirmer un A", () => {
    expect(piecesNonVerifieesPourA({ pieces: { IDENTITE: "VERIFIEE", DIPLOME: "DEPOSEE" } }, P)).toEqual(["DIPLOME", "ATTESTATION_LANGUE"]);
    expect(meilleurEtat(["REFUSEE", "DEPOSEE"])).toBe("DEPOSEE");
  });

  it("résultat reproductible : mêmes entrées, même sortie", () => {
    const e = complet({ niveauEvalue: "SUFFISANT" });
    expect(classer(e, P)).toEqual(classer(structuredClone(e), P));
  });
});
