"use client";

import { MARQUE } from "@bdt/shared";
import { Box, Button, Container, Heading, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { Logo } from "@/components/marque";

// Page d'accueil provisoire : la page d'accueil complète (photos, explications) arrive au lot 2.
export default function Accueil() {
  return (
    <Box bg="nuit" minH="100dvh" color="white">
      <Container maxW="5xl" py="6">
        <Logo clair />
        <Stack gap="6" mt={{ base: "16", md: "24" }} maxW="2xl">
          <Heading as="h1" fontSize={{ base: "3xl", md: "5xl" }} lineHeight="1.15" fontWeight="700">
            Dépose ton profil une fois.{" "}
            <Text as="span" color="menthe">
              On t&apos;aide à être prêt.
            </Text>
          </Heading>
          <Text fontSize="lg" color="whiteAlpha.800">
            {MARQUE.avertissement}
          </Text>
          <Stack direction={{ base: "column", sm: "row" }} gap="3">
            <Button asChild size="lg" bg="menthe" color="nuit" _hover={{ bg: "#64e38f" }}>
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
