// Applique les migrations de la base. Lancé au démarrage en production, avant l'initialisation.
import { appliquerMigrations } from "../lib/migrations.js";
import { creerReserveSql, estNeon } from "../lib/prisma.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL est obligatoire.");
  process.exit(1);
}
const reserve = creerReserveSql(url);
try {
  console.log(`Connexion à la base (${estNeon(url) ? "Neon, WebSocket port 443" : "PostgreSQL"})…`);
  const appliquees = await appliquerMigrations(reserve);
  console.log(appliquees.length ? `Migrations appliquées : ${appliquees.join(", ")}.` : "Base déjà à jour.");
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await reserve.end();
}
