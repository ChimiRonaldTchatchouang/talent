import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Carte } from "./carte";
import { Logo } from "./marque";

/** Mise en page des écrans de compte (inscription, connexion, mot de passe) : pensée pour le téléphone. */
export function CadreCompte({ titre, sousTitre, children, pied }: { titre: string; sousTitre?: ReactNode; children: ReactNode; pied?: ReactNode }) {
  return (
    <Box minH="100dvh" display="grid" placeItems="center" px="4" py="8" bg="fond">
      <Stack w="full" maxW="md" gap="6">
        <Box alignSelf="center">
          <Link href="/" aria-label="Retour à l'accueil">
            <Logo />
          </Link>
        </Box>
        <Carte as="main">
          <Stack gap="5">
            <Stack gap="1">
              <Heading as="h1" size="xl" color="nuit">
                {titre}
              </Heading>
              {sousTitre && <Text color="gris">{sousTitre}</Text>}
            </Stack>
            {children}
          </Stack>
        </Carte>
        {pied && (
          <Box textAlign="center" color="gris">
            {pied}
          </Box>
        )}
      </Stack>
    </Box>
  );
}

/** Lien souligné, couleur de la charte. */
export function Lien({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: "#006D33", fontWeight: 600, textDecoration: "underline" }}>
      {children}
    </Link>
  );
}
