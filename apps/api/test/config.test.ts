import { describe, expect, it } from "vitest";
import { lireConfig, URL_SITE_PRODUCTION } from "../src/lib/config.js";

const base = { DATABASE_URL: "postgresql://x" };

describe("URL_SITE (liens des e-mails)", () => {
  it("en production, une adresse absente, vide ou locale est remplacée par l'adresse publique du site", () => {
    for (const URL_SITE of [undefined, "", "http://localhost:3000", "http://127.0.0.1:3100/"]) {
      const c = lireConfig({ ...base, NODE_ENV: "production", URL_SITE });
      expect(c.URL_SITE).toBe(URL_SITE_PRODUCTION);
      expect(c.urlSiteDeSecours).toBe(true);
    }
  });
  it("en production, l'adresse renseignée est gardée (sans « / » final)", () => {
    const c = lireConfig({ ...base, NODE_ENV: "production", URL_SITE: "https://talents.cabinet.cm/" });
    expect(c.URL_SITE).toBe("https://talents.cabinet.cm");
    expect(c.urlSiteDeSecours).toBe(false);
  });
  it("en local, localhost reste la valeur par défaut", () => {
    expect(lireConfig({ ...base, NODE_ENV: "development" }).URL_SITE).toBe("http://localhost:3000");
  });
});
