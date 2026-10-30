import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Role, Utilisateur } from "@prisma/client";
import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from "fastify";
import fp from "fastify-plugin";
import { erreurs } from "../lib/erreurs.js";

export const NOM_COOKIE_SESSION = "bdt_session";

/** Durée d'une session selon le rôle : courte pour les comptes qui voient tout le vivier. */
const DUREE_SESSION_HEURES: Record<Role, number> = {
  CANDIDAT: 24 * 30,
  ADMIN: 12,
  RECRUTEUR: 12,
};

export type UtilisateurConnecte = Pick<
  Utilisateur,
  "id" | "role" | "nom" | "email" | "telephone" | "estPrincipal" | "emailVerifieLe"
>;

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    ouvrirSession: (reply: FastifyReply, utilisateur: Pick<Utilisateur, "id" | "role">) => Promise<void>;
    fermerSession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    utilisateur: UtilisateurConnecte | null;
  }
}

function empreinte(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

interface OptionsAuth {
  cookieSecurise: boolean;
}

export const pluginAuthentification = fp<OptionsAuth>(async (app, options) => {
  app.decorateRequest("utilisateur", null);

  app.decorate("ouvrirSession", async (reply: FastifyReply, utilisateur: Pick<Utilisateur, "id" | "role">) => {
    const jeton = randomBytes(32).toString("base64url");
    const dureeMs = DUREE_SESSION_HEURES[utilisateur.role] * 3600 * 1000;
    const expireLe = new Date(Date.now() + dureeMs);
    await app.prisma.session.create({
      data: { id: empreinte(jeton), utilisateurId: utilisateur.id, expireLe },
    });
    reply.setCookie(NOM_COOKIE_SESSION, jeton, {
      httpOnly: true,
      secure: options.cookieSecurise,
      sameSite: "lax",
      path: "/",
      expires: expireLe,
    });
  });

  app.decorate("fermerSession", async (request: FastifyRequest, reply: FastifyReply) => {
    const jeton = request.cookies[NOM_COOKIE_SESSION];
    if (jeton) await app.prisma.session.deleteMany({ where: { id: empreinte(jeton) } });
    reply.clearCookie(NOM_COOKIE_SESSION, { path: "/" });
  });

  // Chaque requête : on retrouve l'utilisateur à partir du cookie, côté serveur.
  app.addHook("onRequest", async (request) => {
    const jeton = request.cookies[NOM_COOKIE_SESSION];
    if (!jeton) return;
    const session = await app.prisma.session.findUnique({
      where: { id: empreinte(jeton) },
      include: { utilisateur: true },
    });
    if (!session) return;
    if (session.expireLe < new Date() || session.utilisateur.etat !== "ACTIF") {
      await app.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return;
    }
    const u = session.utilisateur;
    request.utilisateur = {
      id: u.id,
      role: u.role,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone,
      estPrincipal: u.estPrincipal,
      emailVerifieLe: u.emailVerifieLe,
    };
  });
});

/** Refuse la requête si personne n'est connecté. */
export const exigerConnexion: onRequestAsyncHookHandler = async (request) => {
  if (!request.utilisateur) throw erreurs.nonConnecte();
};

/** Refuse la requête si l'utilisateur connecté n'a pas l'un des rôles demandés. */
export function exigerRole(...roles: Role[]): onRequestAsyncHookHandler {
  return async (request) => {
    if (!request.utilisateur) throw erreurs.nonConnecte();
    if (!roles.includes(request.utilisateur.role)) throw erreurs.accesRefuse();
  };
}

/** Utilisateur connecté, après exigerConnexion ou exigerRole (à placer en onRequest, avant la validation). */
export function utilisateurDe(request: FastifyRequest): UtilisateurConnecte {
  if (!request.utilisateur) throw erreurs.nonConnecte();
  return request.utilisateur;
}
