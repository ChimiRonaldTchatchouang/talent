import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lireConfig } from "../src/lib/config.js";
import { envoyerEmail, EXPEDITEUR_TEST_RESEND } from "../src/lib/emails.js";
import { demarrer, viderBase } from "./outils.js";
import type { App } from "../src/app.js";

let app: App;
let prisma: PrismaClient;
const base = { NODE_ENV: "test", DATABASE_URL: "postgresql://x" } as const;
const email = { a: "awa@exemple.cm", sujet: "Sujet", texte: "Texte" };

beforeEach(async () => {
  if (!app) ({ app, prisma } = await demarrer());
  await viderBase(prisma);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

describe("Envoi des e-mails par Resend", () => {
  it("sans clé : mode démo, rien n'est envoyé", async () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig(base), email);
    expect(appel).not.toHaveBeenCalled();
    expect((await prisma.emailEnvoye.findFirstOrThrow()).statut).toBe("DEMO");
  });

  it("avec la clé seule : envoi par Resend avec l'expéditeur de test", async () => {
    const appel = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_cle_de_test" }), email);
    const [url, options] = appel.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers.Authorization).toBe("Bearer re_cle_de_test");
    expect(JSON.parse(options.body)).toMatchObject({ from: EXPEDITEUR_TEST_RESEND, to: ["awa@exemple.cm"], subject: "Sujet" });
    expect((await prisma.emailEnvoye.findFirstOrThrow()).statut).toBe("ENVOYE");
  });

  it("avec l'adresse du cabinet : elle est utilisée comme expéditeur", async () => {
    const appel = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", appel);
    await envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_x", EMAIL_EXPEDITEUR: "Cabinet <contact@cabinet.cm>" }), email);
    expect(JSON.parse(appel.mock.calls[0]![1].body).from).toBe("Cabinet <contact@cabinet.cm>");
  });

  it("un refus de Resend est noté dans le journal des e-mails sans bloquer l'action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"domain not verified"}', { status: 403 })));
    await expect(envoyerEmail(prisma, lireConfig({ ...base, RESEND_API_KEY: "re_x" }), email)).resolves.toBeUndefined();
    const e = await prisma.emailEnvoye.findFirstOrThrow();
    expect(e.statut).toBe("ECHEC");
    expect(e.erreur).toContain("domain not verified");
  });
});
