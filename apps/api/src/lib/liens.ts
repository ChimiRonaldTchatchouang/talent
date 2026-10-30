import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Liens temporaires signés (HMAC) : téléchargement d'un fichier privé, téléversement direct.
 * Le contenu du lien est lisible mais ne peut pas être modifié sans la clé SECRET_LIENS.
 */
export function signer(secret: string, contenu: object, dureeSecondes: number): string {
  const charge = Buffer.from(JSON.stringify({ ...contenu, exp: Math.floor(Date.now() / 1000) + dureeSecondes })).toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret).update(charge).digest("base64url");
  return `${charge}.${signature}`;
}

/** Vérifie un lien signé. Renvoie son contenu, ou null s'il est falsifié ou expiré. */
export function verifier<T extends object>(secret: string, jeton: string): T | null {
  const [charge, signature] = jeton.split(".");
  if (!charge || !signature) return null;
  const attendue = createHmac("sha256", secret).update(charge).digest();
  const recue = Buffer.from(signature, "base64url");
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const contenu = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof contenu.exp !== "number" || contenu.exp < Math.floor(Date.now() / 1000)) return null;
    return contenu;
  } catch {
    return null;
  }
}

const DUREE_LIEN_FICHIER_S = 10 * 60;

/**
 * Lien temporaire (10 minutes) vers un fichier privé. Adresse absolue quand l'adresse publique
 * de l'API est connue, sinon relative au site (/api/…).
 */
export function lienFichier(
  config: { SECRET_LIENS: string; URL_API_PUBLIQUE?: string; RENDER_EXTERNAL_URL?: string },
  fichierId: string,
): { chemin: string; url: string | null } {
  const chemin = `/fichiers?jeton=${signer(config.SECRET_LIENS, { f: fichierId }, DUREE_LIEN_FICHIER_S)}`;
  const base = config.URL_API_PUBLIQUE ?? config.RENDER_EXTERNAL_URL;
  return { chemin, url: base ? `${base.replace(/\/+$/, "")}${chemin}` : null };
}
