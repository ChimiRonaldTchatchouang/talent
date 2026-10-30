import type { ErreurApi } from "@bdt/shared";

/** Erreur renvoyée par l'API, avec un message en français prêt à afficher. */
export class ErreurClient extends Error {
  constructor(
    public readonly statut: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}

type Methode = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Appel à l'API publique. Toute la logique métier reste côté serveur. */
export async function api<T>(chemin: string, options: { methode?: Methode; corps?: unknown } = {}): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: options.methode ?? "GET",
      credentials: "same-origin",
      headers: options.corps !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
    });
  } catch {
    throw new ErreurClient(0, "RESEAU", "Pas de connexion internet. Vérifiez votre réseau et réessayez.");
  }
  if (reponse.status === 204) return undefined as T;
  const donnees: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const e = (donnees as ErreurApi | null)?.erreur;
    throw new ErreurClient(
      reponse.status,
      e?.code ?? "INCONNU",
      e?.message ?? "Le service est momentanément indisponible. Réessayez dans un instant.",
      e?.details,
    );
  }
  return donnees as T;
}

export function messageErreur(e: unknown): string {
  return e instanceof ErreurClient ? e.message : "Une erreur inattendue est survenue.";
}
