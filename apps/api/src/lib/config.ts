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
});

export type Config = z.infer<typeof schemaConfig> & { cookieSecurise: boolean };

export function lireConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = schemaConfig.parse(env);
  return {
    ...config,
    cookieSecurise: config.COOKIE_SECURISE ?? config.NODE_ENV === "production",
  };
}
