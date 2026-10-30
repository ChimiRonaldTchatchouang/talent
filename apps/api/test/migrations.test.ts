import { inject, describe, expect, it } from "vitest";
import { appliquerMigrations } from "../src/lib/migrations.js";
import { creerReserveSql, estNeon } from "../src/lib/prisma.js";

describe("Migrations", () => {
  it("ne réapplique jamais une migration déjà appliquée", async () => {
    const reserve = creerReserveSql(inject("urlBaseTests"));
    try {
      expect(await appliquerMigrations(reserve)).toEqual([]);
      const c = await reserve.connect();
      const lignes = await c.query(`SELECT migration_name, checksum FROM "_prisma_migrations"`);
      c.release();
      expect(lignes.rows.length).toBeGreaterThan(0);
      expect(String(lignes.rows[0]?.checksum)).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      await reserve.end();
    }
  });

  it("reconnaît une adresse Neon (connexion par WebSocket, port 443)", () => {
    expect(estNeon("postgresql://u:p@ep-x-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require")).toBe(true);
    expect(estNeon("postgresql://postgres:postgres@localhost:5432/postgres")).toBe(false);
    expect(estNeon(undefined)).toBe(false);
  });
});
