import type { NextConfig } from "next";

// Le navigateur appelle toujours /api/… sur le même domaine que le site :
// Next relaie vers l'API (Render). Les cookies de session restent ainsi « first-party ».
const URL_API = process.env.URL_API ?? "http://localhost:4000";

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
