import type { PrismaClient, Role } from "@prisma/client";
import { inject } from "vitest";
import { construireApp, type App } from "../src/app.js";
import { lireConfig } from "../src/lib/config.js";
import { chargerDonneesDepart } from "../src/lib/initialisation.js";
import { hacherMotDePasse } from "../src/lib/mots-de-passe.js";
import { creerPrisma } from "../src/lib/prisma.js";

export const MOT_DE_PASSE = "motdepasse-solide-1";

export async function demarrer(): Promise<{ app: App; prisma: PrismaClient }> {
  const url = inject("urlBaseTests");
  const prisma = creerPrisma(url);
  const app = await construireApp(lireConfig({ NODE_ENV: "test", DATABASE_URL: url }), prisma);
  await app.ready();
  return { app, prisma };
}

/** Vide les tables (sauf le journal, qui ne peut pas être vidé) et recharge les listes de départ. */
export async function viderBase(prisma: PrismaClient): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.parametresClassement.deleteMany();
  await prisma.competence.deleteMany();
  await prisma.domaine.deleteMany();
  await prisma.testLangue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.diplome.deleteMany();
  await prisma.utilisateur.deleteMany();
  await chargerDonneesDepart(prisma);
}

let compteur = 0;
export async function creerCompte(
  prisma: PrismaClient,
  role: Role,
  options: { email?: string; telephone?: string; estPrincipal?: boolean } = {},
) {
  compteur += 1;
  return prisma.utilisateur.create({
    data: {
      role,
      nom: `${role} ${compteur}`,
      email: options.telephone ? null : (options.email ?? `${role.toLowerCase()}${compteur}@exemple.cm`),
      telephone: options.telephone ?? null,
      estPrincipal: options.estPrincipal ?? false,
      motDePasseHash: await hacherMotDePasse(MOT_DE_PASSE),
    },
  });
}

/** Se connecte et renvoie l'en-tête cookie à réutiliser. */
export async function connecter(app: App, identifiant: string, motDePasse = MOT_DE_PASSE): Promise<string> {
  const rep = await app.inject({ method: "POST", url: "/auth/connexion", payload: { identifiant, motDePasse } });
  if (rep.statusCode !== 200) throw new Error(`Connexion impossible : ${rep.body}`);
  const cookie = rep.cookies.find((c) => c.name === "bdt_session");
  if (!cookie) throw new Error("Cookie de session absent");
  return `bdt_session=${cookie.value}`;
}
