"use client";

import { MARQUE } from "@bdt/shared";
import { Box, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LuCheck } from "react-icons/lu";
import { Photo } from "./accueil/portraits";
import { PastilleGrade } from "./badges";
import { Logo } from "./marque";

/**
 * Mise en page des écrans de compte (connexion, inscription, mot de passe) : une carte en deux volets,
 * illustration à gauche et formulaire épuré à droite. Sur téléphone, le volet gauche devient un bandeau compact.
 */
export function CadreCompte({ titre, sousTitre, children, pied }: { titre: string; sousTitre?: ReactNode; children: ReactNode; pied?: ReactNode }) {
  return (
    <Box minH="100dvh" display="grid" placeItems="center" px={{ base: "0", md: "6" }} py={{ base: "0", md: "10" }} bgGradient="to-br" gradientFrom="brume" gradientTo="fond">
      <Grid
        as="main"
        w="full"
        maxW="1040px"
        minH={{ base: "100dvh", md: "620px" }}
        templateColumns={{ base: "1fr", md: "0.9fr 1.1fr" }}
        // Sur téléphone : bandeau compact en haut, formulaire dessous.
        templateRows={{ base: "auto 1fr", md: "1fr" }}
        bg="white"
        borderRadius={{ base: "0", md: "32px" }}
        boxShadow={{ md: "0 30px 80px rgba(15, 42, 74, 0.18)" }}
        overflow="hidden"
      >
        {/* Volet gauche : marque, accroche, illustration */}
        <Stack bg="nuit" color="white" p={{ base: "6", md: "10" }} gap={{ base: "3", md: "6" }} position="relative" overflow="hidden">
          <Link href="/" aria-label="Retour à l'accueil">
            <Logo clair />
          </Link>
          <Text fontSize={{ base: "md", md: "xl" }} color="whiteAlpha.900" maxW="xs" lineHeight="1.4">
            {MARQUE.accroche}
          </Text>
          <Box display={{ base: "none", md: "block" }} flex="1" position="relative" minH="340px">
            {/* Illustration posée dans une forme arrondie, avec deux petites cartes qui flottent */}
            <Box position="absolute" inset="6% 4% 0 4%" bg="menthe" borderRadius="58% 42% 55% 45% / 46% 54% 46% 54%" opacity="0.18" />
            <Photo
              emplacement="accueil"
              position="absolute"
              left="12%"
              right="12%"
              top="14%"
              bottom="0"
              borderRadius="48% 52% 0 0 / 40% 40% 0 0"
            />
            <HStack className="bdt-flottant" position="absolute" left="0" top="18%" bg="white" color="encre" borderRadius="16px" p="2" pr="4" gap="2" boxShadow="lg">
              <PastilleGrade grade="A" taille="sm" />
              <Text fontSize="sm" fontWeight="700" color="nuit">
                Grade A
              </Text>
            </HStack>
            <HStack className="bdt-flottant bdt-flottant-lent" position="absolute" right="0" bottom="22%" bg="menthe" color="nuit" borderRadius="full" px="3" py="1.5" gap="1.5" fontSize="sm" fontWeight="600" boxShadow="lg">
              <LuCheck aria-hidden /> Dossier envoyé
            </HStack>
          </Box>
          <Box position="absolute" right="-16" top="-16" w="48" h="48" borderRadius="full" bg="whiteAlpha.100" display={{ base: "none", md: "block" }} />
        </Stack>

        {/* Volet droit : formulaire */}
        <Stack justify={{ base: "flex-start", md: "center" }} px={{ base: "6", md: "14" }} py={{ base: "8", md: "12" }} gap="7">
          <Stack gap="2" className="bdt-page">
            <Heading as="h1" fontSize={{ base: "26px", md: "30px" }} color="nuit" fontWeight="700">
              {titre}
            </Heading>
            {sousTitre && <Text color="gris">{sousTitre}</Text>}
          </Stack>
          <Box maxW="420px" w="full">
            {children}
          </Box>
          {pied && (
            <Box color="gris" fontSize="sm">
              {pied}
            </Box>
          )}
        </Stack>
      </Grid>
    </Box>
  );
}

/** Lien de la charte : souligné au survol, avec une transition douce. */
export function Lien({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Box asChild color="emeraude.600" fontWeight="600" textDecoration="underline" textDecorationColor="transparent" textUnderlineOffset="3px" transition="text-decoration-color 0.2s" _hover={{ textDecorationColor: "currentColor" }}>
      <Link href={href}>{children}</Link>
    </Box>
  );
}
