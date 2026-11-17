import { z } from "zod";

/**
 * Adresse publique actuelle du site (domaine Vercel temporaire), utilisée en production quand URL_SITE
 * n'est pas renseignée sur Render ou pointe par erreur vers localhost : sans elle, les e-mails
 * contiendraient des liens « localhost » inutilisables. À remplacer par le domaine du client (D-64).
 */
export const URL_SITE_PRODUCTION = "https://talent-beta-indol.vercel.app";

const estLocale = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url);

const schemaConfig = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire."),
  /** Adresse publique du site (sert aux liens des e-mails et au CORS). */
  URL_SITE: z.string().url().optional(),
  /** Cookies « Secure » : obligatoire en production (HTTPS). */
  COOKIE_SECURISE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  /** Connexions échouées autorisées avant blocage temporaire du compte. */
  CONNEXION_ESSAIS_MAX: z.coerce.number().int().min(1).default(5),
  CONNEXION_BLOCAGE_MINUTES: z.coerce.number().int().min(1).default(15),
  /**
   * Clé de signature des liens temporaires (fichiers, téléversements). 32 caractères minimum.
   * Facultative : sans elle, une clé aléatoire est créée au premier démarrage et gardée en base.
   */
  SECRET_LIENS: z.string().min(32, "SECRET_LIENS doit contenir au moins 32 caractères.").optional(),
  /** Adresse publique de l'API (téléversements directs). Déduite de la requête si absente. */
  URL_API_PUBLIQUE: z.string().url().optional(),
  /** Fournie automatiquement par Render : adresse publique du service. */
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  /** Resend : sans clé, les e-mails sont seulement écrits dans le journal des e-mails (mode démo). */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_EXPEDITEUR: z.string().optional(),
});

export type Config = Omit<z.infer<typeof schemaConfig>, "URL_SITE"> & {
  URL_SITE: string;
  cookieSecurise: boolean;
  /** Vrai si URL_SITE manquait (ou valait localhost) en production et a été remplacée par URL_SITE_PRODUCTION. */
  urlSiteDeSecours: boolean;
};

export function lireConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Une valeur vide (variable créée sans valeur sur Render) compte comme absente.
  const config = schemaConfig.parse({ ...env, URL_SITE: env.URL_SITE?.trim() || undefined });
  const production = config.NODE_ENV === "production";
  const saisie = config.URL_SITE?.replace(/\/+$/, "");
  const deSecours = production && (!saisie || estLocale(saisie));
  return {
    ...config,
    URL_SITE: deSecours ? URL_SITE_PRODUCTION : (saisie ?? "http://localhost:3000"),
    cookieSecurise: config.COOKIE_SECURISE ?? production,
    urlSiteDeSecours: deSecours,
  };
}
