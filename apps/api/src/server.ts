import { construireApp } from "./app.js";
import { lireConfig } from "./lib/config.js";
import { creerPrisma } from "./lib/prisma.js";
import { alerterFinsAcces } from "./lib/recruteurs.js";

const config = lireConfig();
const prisma = creerPrisma();
const app = await construireApp(config, prisma);

const arreter = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", arreter);
process.on("SIGINT", arreter);

await app.listen({ port: config.PORT, host: "0.0.0.0" });

// Alerte aux administrateurs avant la fin des accès recruteurs (M10) : au démarrage puis toutes les 6 heures.
const verifier = () => alerterFinsAcces(prisma, config).catch((e) => app.log.error(e));
void verifier();
setInterval(verifier, 6 * 3600 * 1000).unref();
