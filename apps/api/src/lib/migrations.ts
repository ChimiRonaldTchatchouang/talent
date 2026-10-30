import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { ReserveSql } from "./prisma.js";

/** Dossier des migrations générées par Prisma (apps/api/prisma/migrations), depuis src/lib ou dist/lib. */
export const DOSSIER_MIGRATIONS = fileURLToPath(new URL("../../prisma/migrations", import.meta.url));

// Même table et même empreinte que Prisma Migrate : les deux outils restent compatibles.
const TABLE_SUIVI = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

// Verrou qui empêche deux démarrages simultanés d'appliquer la même migration.
const CLE_VERROU = 72707369;

/**
 * Applique, dans l'ordre, les migrations pas encore appliquées. Chaque migration est appliquée
 * dans sa propre transaction : en cas d'erreur, rien n'est modifié pour cette migration.
 * Retourne le nom des migrations appliquées.
 */
export async function appliquerMigrations(reserve: ReserveSql, dossier = DOSSIER_MIGRATIONS): Promise<string[]> {
  const noms = (await readdir(dossier, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const appliquees: string[] = [];
  const connexion = await reserve.connect();
  try {
    await connexion.query(TABLE_SUIVI);
    for (const nom of noms) {
      const sql = await readFile(`${dossier}/${nom}/migration.sql`, "utf8");
      const empreinte = createHash("sha256").update(sql).digest("hex");
      await connexion.query("BEGIN");
      try {
        await connexion.query("SELECT pg_advisory_xact_lock($1)", [CLE_VERROU]);
        const existante = await connexion.query(
          `SELECT checksum FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
          [nom],
        );
        if (existante.rows.length > 0) {
          await connexion.query("COMMIT");
          if (existante.rows[0]?.checksum !== empreinte) {
            console.warn(`Attention : la migration ${nom} a été modifiée après avoir été appliquée.`);
          }
          continue;
        }
        await connexion.query(sql);
        await connexion.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, now(), 1)`,
          [randomUUID(), empreinte, nom],
        );
        await connexion.query("COMMIT");
        appliquees.push(nom);
      } catch (e) {
        await connexion.query("ROLLBACK").catch(() => undefined);
        throw new Error(`Échec de la migration ${nom} : ${(e as Error).message}`);
      }
    }
  } finally {
    connexion.release();
  }
  return appliquees;
}
