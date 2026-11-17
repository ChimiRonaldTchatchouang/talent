"use client";

import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LuArrowRight } from "react-icons/lu";
import { Apparition } from "@/components/animations";

/**
 * Bouton « pilule » de la page d'accueil.
 * Effets : élévation au survol, reflet lumineux qui traverse le bouton, flèche qui glisse, enfoncement au clic.
 */
export function BoutonPilule({
  href,
  children,
  variante = "action",
  taille = "normale",
  icone = <LuArrowRight />,
}: {
  href: string;
  children: ReactNode;
  variante?: "action" | "clair" | "contour" | "menthe";
  taille?: "petite" | "normale";
  icone?: ReactNode;
}) {
  const styles = {
    action: { bg: "emeraude.600", color: "white", bord: "transparent", rond: "whiteAlpha.300", ombre: "rgba(0, 109, 51, 0.35)" },
    menthe: { bg: "menthe", color: "nuit", bord: "transparent", rond: "nuit/10", ombre: "rgba(124, 245, 165, 0.45)" },
    clair: { bg: "white", color: "nuit", bord: "nuit/10", rond: "brume", ombre: "rgba(15, 42, 74, 0.15)" },
    contour: { bg: "transparent", color: "nuit", bord: "nuit/20", rond: "nuit/5", ombre: "rgba(15, 42, 74, 0.12)" },
  }[variante];
  const petite = taille === "petite";
  return (
    <Link href={href} className="bdt-bouton">
      <HStack
        as="span"
        display="inline-flex"
        gap="2.5"
        bg={styles.bg}
        color={styles.color}
        borderWidth="1px"
        borderColor={styles.bord}
        borderRadius="full"
        pl={petite ? "4" : "6"}
        pr={icone ? (petite ? "1.5" : "2") : petite ? "4" : "6"}
        h={petite ? "42px" : "52px"}
        fontWeight="600"
        fontSize={petite ? "sm" : "md"}
        whiteSpace="nowrap"
        position="relative"
        overflow="hidden"
        css={{ "--bdt-ombre": styles.ombre }}
      >
        <Text as="span" position="relative" zIndex="1">
          {children}
        </Text>
        {icone && (
          <Box
            as="span"
            className="bdt-bouton-fleche"
            w={petite ? "8" : "9"}
            h={petite ? "8" : "9"}
            borderRadius="full"
            bg={styles.rond}
            display="grid"
            placeItems="center"
            position="relative"
            zIndex="1"
          >
            {icone}
          </Box>
        )}
      </HStack>
    </Link>
  );
}

/** Mot mis en valeur par un cadre vert qui se dessine à l'apparition (inspiré du modèle). */
export function MotEncadre({ children, sombre = false }: { children: ReactNode; sombre?: boolean }) {
  return (
    <Box
      as="span"
      className="bdt-encadre"
      display="inline-block"
      position="relative"
      px="0.18em"
      mx="0.05em"
      lineHeight="1.15"
      color={sombre ? "menthe" : "emeraude.600"}
      bg={sombre ? "menthe/10" : "menthe/25"}
    >
      {children}
      {/* Les quatre petits carrés aux coins, comme une sélection dans un logiciel de dessin. */}
      {["haut-gauche", "haut-droite", "bas-gauche", "bas-droite"].map((coin) => (
        <Box as="span" key={coin} className={`bdt-encadre-coin bdt-encadre-${coin}`} bg={sombre ? "menthe" : "emeraude.600"} aria-hidden />
      ))}
    </Box>
  );
}

/** Petite étiquette au-dessus d'un titre de section. */
export function Etiquette({ children, sombre = false }: { children: ReactNode; sombre?: boolean }) {
  return (
    <HStack
      display="inline-flex"
      gap="2"
      bg={sombre ? "whiteAlpha.100" : "white"}
      color={sombre ? "menthe" : "emeraude.700"}
      borderWidth="1px"
      borderColor={sombre ? "whiteAlpha.200" : "emeraude.100"}
      borderRadius="full"
      px="3.5"
      py="1"
      fontSize="sm"
      fontWeight="600"
    >
      <Box w="2" h="2" borderRadius="full" bg={sombre ? "menthe" : "emeraude.500"} className="bdt-pulsation" aria-hidden />
      {children}
    </HStack>
  );
}

export function TitreSection({
  etiquette,
  titre,
  texte,
  centre = false,
  sombre = false,
}: {
  etiquette?: string;
  titre: ReactNode;
  texte?: ReactNode;
  centre?: boolean;
  sombre?: boolean;
}) {
  return (
    <Apparition>
      <Stack gap="4" maxW="3xl" mx={centre ? "auto" : undefined} textAlign={centre ? "center" : undefined} align={centre ? "center" : "flex-start"}>
        {etiquette && <Etiquette sombre={sombre}>{etiquette}</Etiquette>}
        <Heading as="h2" fontSize={{ base: "28px", md: "42px" }} lineHeight="1.25" color={sombre ? "white" : "nuit"} fontWeight="700" letterSpacing="-0.01em">
          {titre}
        </Heading>
        {texte && (
          <Text color={sombre ? "whiteAlpha.800" : "gris"} fontSize={{ base: "md", md: "lg" }} maxW="2xl">
            {texte}
          </Text>
        )}
      </Stack>
    </Apparition>
  );
}
