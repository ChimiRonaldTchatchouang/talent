import { MARQUE } from "@bdt/shared";
import type { MetadataRoute } from "next";

/** Application installable sur l'écran d'accueil du téléphone (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MARQUE.nom,
    short_name: MARQUE.nomCourt,
    description: MARQUE.accroche,
    lang: "fr",
    start_url: "/candidat",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F9FF",
    theme_color: "#0F2A4A",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
