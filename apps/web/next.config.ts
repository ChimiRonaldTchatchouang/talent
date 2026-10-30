import type { NextConfig } from "next";

// Le navigateur appelle toujours /api/… sur le même domaine que le site :
// Next relaie vers l'API (Render). Les cookies de session restent ainsi « first-party ».
// Sur Vercel, URL_API est obligatoire : sans elle, le site relaierait vers localhost et aucune page ne marcherait.
if (process.env.VERCEL && !process.env.URL_API) {
  throw new Error(
    "La variable URL_API est absente : renseignez l'adresse de l'API Render dans Vercel (Settings > Environment Variables), puis redéployez.",
  );
}
// Espaces, « / » ou « . » en fin d’adresse sont retirés : une faute de saisie ne doit pas casser le site.
const URL_API = (process.env.URL_API ?? "http://localhost:4000").trim().replace(/[./]+$/, "");

const config: NextConfig = {
  transpilePackages: ["@bdt/shared"],
  experimental: { optimizePackageImports: ["@chakra-ui/react"] },
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:chemin*", destination: `${URL_API}/:chemin*` }];
  },
  async headers() {
    return [
      {
        source: "/:chemin*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;
