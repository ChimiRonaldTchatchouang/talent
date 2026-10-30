"use client";

import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/marque";

/** Affichée par le service worker quand il n'y a pas de réseau. */
export default function HorsLigne() {
  return (
    <Box minH="100dvh" display="grid" placeItems="center" px="6" bg="fond">
      <Stack gap="5" maxW="sm" textAlign="center" align="center">
        <Logo />
        <Heading as="h1" size="xl" color="nuit">
          Pas de connexion
        </Heading>
        <Text color="gris">
          Ton téléphone n&apos;est pas connecté à Internet. Tes réponses déjà enregistrées ne sont pas perdues : reviens dès que le
          réseau revient.
        </Text>
        <Button size="lg" colorPalette="emeraude" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Stack>
    </Box>
  );
}
