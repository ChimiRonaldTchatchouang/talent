// Recrée la base de test « bdt_tests » à chaque passage et y applique les migrations.
import pg from "pg";
import { appliquerMigrations } from "../src/lib/migrations.js";
import { creerReserveSql } from "../src/lib/prisma.js";

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
  // Même outil de migration qu'en production.
  const reserve = creerReserveSql(urlTests);
  await appliquerMigrations(reserve);
  await reserve.end();
  provide("urlBaseTests", urlTests);
}

declare module "vitest" {
  export interface ProvidedContext {
    urlBaseTests: string;
  }
}
