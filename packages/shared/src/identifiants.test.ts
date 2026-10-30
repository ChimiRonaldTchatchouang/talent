import { describe, expect, it } from "vitest";
import { analyserIdentifiant, normaliserTelephone } from "./identifiants.js";

describe("normaliserTelephone", () => {
  it("ajoute +237 à un numéro camerounais à 9 chiffres", () => {
    expect(normaliserTelephone("6 99 12 34 56")).toBe("+237699123456");
  });
  it("accepte 237 ou 00237 en tête", () => {
    expect(normaliserTelephone("237699123456")).toBe("+237699123456");
    expect(normaliserTelephone("00237699123456")).toBe("+237699123456");
  });
  it("garde un numéro international déjà complet", () => {
    expect(normaliserTelephone("+33 6 12 34 56 78")).toBe("+33612345678");
  });
  it("refuse une saisie inexploitable", () => {
    expect(normaliserTelephone("12345")).toBeNull();
    expect(normaliserTelephone("abc")).toBeNull();
  });
});

describe("analyserIdentifiant", () => {
  it("reconnaît un e-mail et le met en minuscules", () => {
    expect(analyserIdentifiant(" Awa@Exemple.CM ")).toEqual({ type: "email", valeur: "awa@exemple.cm" });
  });
  it("reconnaît un téléphone", () => {
    expect(analyserIdentifiant("699123456")).toEqual({ type: "telephone", valeur: "+237699123456" });
  });
  it("refuse un e-mail mal formé", () => {
    expect(analyserIdentifiant("awa@")).toBeNull();
  });
});
