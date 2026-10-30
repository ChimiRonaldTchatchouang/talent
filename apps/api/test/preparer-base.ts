// Recrée la base de test « bdt_tests » à chaque passage et y applique les migrations.
import { execFileSync } from "node:child_process";
import pg from "pg";

export default async function preparer({ provide }: { provide: (cle: string, valeur: string) => void }) {
  const urlAdmin = process.env.TEST_DATABASE_URL_ADMIN ?? "postgresql://postgres:postgres@localhost:5432/postgres";
  const client = new pg.Client({ connectionString: urlAdmin });
  await client.connect();
  await client.query("DROP DATABASE IF EXISTS bdt_tests WITH (FORCE)");
  await client.query("CREATE DATABASE bdt_tests");
  await client.end();

  const url = new URL(urlAdmin);
  url.pathname = "/bdt_tests";
  const urlTests = url.toString();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: urlTests, DATABASE_URL_DIRECTE: urlTests },
    stdio: "ignore",
  });
  provide("urlBaseTests", urlTests);
}

declare module "vitest" {
  export interface ProvidedContext {
    urlBaseTests: string;
  }
}
