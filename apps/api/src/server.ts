import { construireApp } from "./app.js";
import { lireConfig } from "./lib/config.js";
import { creerPrisma } from "./lib/prisma.js";

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
