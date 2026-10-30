import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * Charte graphique (section 12 de la spécification).
 * Toutes les couleurs de l'interface passent par ces jetons.
 */
export const COULEURS = {
  nuit: "#0F2A4A",
  emeraude: "#006D33",
  menthe: "#7CF5A5",
  fond: "#F8F9FF",
  brume: "#EEF2FB",
  encre: "#101B2B",
  orange: "#D97706",
  violet: "#912CEA",
  gris: "#56637A",
  rougeClair: "#FDE4E1",
  rouge: "#B42318",
} as const;

const config = defineConfig({
  globalCss: {
    "html, body": { bg: "fond", color: "encre" },
    body: { fontSize: { base: "16px", md: "15px" } },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "var(--font-poppins), system-ui, sans-serif" },
        body: { value: "var(--font-poppins), system-ui, sans-serif" },
      },
      radii: { carte: { value: "12px" } },
      colors: {
        nuit: { value: COULEURS.nuit },
        emeraude: {
          50: { value: "#E6F4EC" },
          100: { value: "#C2E5D0" },
          200: { value: "#8FD0AA" },
          300: { value: "#5BB983" },
          400: { value: "#2A9A5C" },
          500: { value: "#0B8043" },
          600: { value: COULEURS.emeraude },
          700: { value: "#00592A" },
          800: { value: "#004521" },
          900: { value: "#003218" },
          950: { value: "#00200F" },
        },
        menthe: { value: COULEURS.menthe },
        fond: { value: COULEURS.fond },
        brume: { value: COULEURS.brume },
        encre: { value: COULEURS.encre },
        gris: { value: COULEURS.gris },
        grade: {
          A: { value: COULEURS.emeraude },
          B: { value: COULEURS.nuit },
          C: { value: COULEURS.orange },
          D: { value: COULEURS.violet },
          hors: { value: COULEURS.gris },
        },
        etat: {
          verifie: { value: COULEURS.menthe },
          attente: { value: COULEURS.brume },
          refuse: { value: COULEURS.rougeClair },
          refuseTexte: { value: COULEURS.rouge },
        },
      },
      shadows: {
        carte: { value: "0 1px 2px rgba(16,27,43,0.04), 0 4px 16px rgba(16,27,43,0.06)" },
      },
    },
    semanticTokens: {
      colors: {
        emeraude: {
          solid: { value: "{colors.emeraude.600}" },
          contrast: { value: "white" },
          fg: { value: "{colors.emeraude.700}" },
          muted: { value: "{colors.emeraude.100}" },
          subtle: { value: "{colors.emeraude.50}" },
          emphasized: { value: "{colors.emeraude.200}" },
          focusRing: { value: "{colors.emeraude.500}" },
        },
      },
    },
    recipes: {
      button: {
        base: { fontWeight: "600", borderRadius: "carte" },
        variants: {
          size: {
            // Boutons larges : 52 px de haut sur téléphone.
            lg: { h: { base: "52px", md: "48px" }, px: "6", fontSize: "md" },
          },
        },
      },
    },
  },
});

export const systeme = createSystem(defaultConfig, config);
