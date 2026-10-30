import { z } from "zod";

const schemaConfig = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire."),
  /** Adresse publique du site (sert aux liens des e-mails et au CORS). */
  URL_SITE: z.string().url().default("http://localhost:3000"),
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

export type Config = z.infer<typeof schemaConfig> & { cookieSecurise: boolean };

export function lireConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = schemaConfig.parse(env);
  return {
    ...config,
    cookieSecurise: config.COOKIE_SECURISE ?? config.NODE_ENV === "production",
  };
}
