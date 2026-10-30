import { neonConfig, Pool as PoolNeon } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import ws from "ws";

/**
 * Neon est joint par WebSocket sur le port 443 (comme le web), et non sur le port PostgreSQL 5432 :
 * certains hébergeurs (Render) n'arrivent pas à joindre Neon sur 5432 (erreur P1001).
 * En local et en test, on garde une connexion PostgreSQL classique.
 */
export function estNeon(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

neonConfig.webSocketConstructor = ws;

export function creerPrisma(url: string | undefined = process.env.DATABASE_URL): PrismaClient {
  if (url && estNeon(url)) return new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  return new PrismaClient(url ? { datasourceUrl: url } : undefined);
}

/** Connexion SQL brute (migrations), par WebSocket pour Neon, classique sinon. */
export interface ConnexionSql {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(): void;
}
export interface ReserveSql {
  connect(): Promise<ConnexionSql>;
  end(): Promise<void>;
}

export function creerReserveSql(url: string): ReserveSql {
  return (estNeon(url) ? new PoolNeon({ connectionString: url, max: 1 }) : new pg.Pool({ connectionString: url, max: 1 })) as unknown as ReserveSql;
}
