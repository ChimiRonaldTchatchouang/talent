"use client";

import { Box, Container, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuMenu, LuX } from "react-icons/lu";
import { Logo } from "@/components/marque";
import { useLangue } from "@/lib/preferences";
import { BoutonPilule } from "./elements";

const LIENS: { href: string; libelle: [string, string] }[] = [
  { href: "#etapes", libelle: ["Comment ça marche", "How it works"] },
  { href: "#pourquoi", libelle: ["Pourquoi nous", "Why us"] },
  { href: "#grades", libelle: ["Les grades", "Grades"] },
  { href: "#services", libelle: ["Services", "Services"] },
  { href: "#questions", libelle: ["Questions", "FAQ"] },
];

/** Bascule français / anglais (pastille FR | EN). */
export function BasculeLangue() {
  const { langue, setLangue } = useLangue();
  return (
    <HStack gap="0" bg="white" borderRadius="full" p="1" borderWidth="1px" borderColor="nuit/10" role="group" aria-label="Langue / Language">
      {(["fr", "en"] as const).map((l) => (
        <Box
          key={l}
          as="button"
          onClick={() => setLangue(l)}
          aria-pressed={langue === l}
          px="2.5"
          h="8"
          borderRadius="full"
          fontSize="xs"
          fontWeight="700"
          bg={langue === l ? "nuit" : "transparent"}
          color={langue === l ? "white" : "gris"}
          transition="background-color 0.25s ease, color 0.25s ease"
        >
          {l.toUpperCase()}
        </Box>
      ))}
    </HStack>
  );
}

/** En-tête collé en haut : transparent sur le bandeau, puis fond givré dès que la page défile. */
export function Entete() {
  const [defile, setDefile] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { tr } = useLangue();

  useEffect(() => {
    const maj = () => setDefile(window.scrollY > 12);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="20"
      transition="background-color 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease"
      bg={defile || menuOuvert ? "white/85" : "transparent"}
      backdropFilter={defile ? "saturate(1.6) blur(14px)" : undefined}
      boxShadow={defile ? "0 6px 24px rgba(15, 42, 74, 0.07)" : "none"}
    >
      <Container maxW="7xl" py={defile ? "3" : "5"} transition="padding 0.3s ease">
        <Flex justify="space-between" align="center" gap="4">
          <Link href="/" aria-label={tr("Accueil", "Home")}>
            <Logo />
          </Link>
          <HStack as="nav" gap="1" display={{ base: "none", lg: "flex" }} aria-label={tr("Sections de la page", "Page sections")}>
            {LIENS.map(({ href, libelle }) => (
              <a key={href} href={href} className="bdt-lien-menu">
                {tr(...libelle)}
              </a>
            ))}
          </HStack>
          <HStack gap="2">
            <BasculeLangue />
            <Box display={{ base: "none", sm: "block" }}>
              <BoutonPilule href="/connexion" variante="clair" taille="petite" icone={null}>
                {tr("Se connecter", "Log in")}
              </BoutonPilule>
            </Box>
            <Box display={{ base: "none", md: "block" }}>
              <BoutonPilule href="/inscription" taille="petite">
                {tr("Créer mon profil", "Create my profile")}
              </BoutonPilule>
            </Box>
            <Box
              as="button"
              display={{ base: "grid", lg: "none" }}
              placeItems="center"
              w="11"
              h="11"
              borderRadius="full"
              bg="white"
              color="nuit"
              borderWidth="1px"
              borderColor="nuit/10"
              aria-label={menuOuvert ? tr("Fermer le menu", "Close menu") : tr("Ouvrir le menu", "Open menu")}
              aria-expanded={menuOuvert}
              onClick={() => setMenuOuvert((o) => !o)}
            >
              {menuOuvert ? <LuX /> : <LuMenu />}
            </Box>
          </HStack>
        </Flex>

        {menuOuvert && (
          <Stack className="bdt-page" display={{ lg: "none" }} gap="1" pt="4" pb="2">
            {LIENS.map(({ href, libelle }) => (
              <a key={href} href={href} onClick={() => setMenuOuvert(false)}>
                <Text px="3" py="3" borderRadius="12px" fontWeight="600" color="nuit" _hover={{ bg: "brume" }}>
                  {tr(...libelle)}
                </Text>
              </a>
            ))}
            <Stack direction="row" gap="2" pt="2" wrap="wrap">
              <BoutonPilule href="/inscription">{tr("Créer mon profil", "Create my profile")}</BoutonPilule>
              <BoutonPilule href="/connexion" variante="clair" icone={null}>
                {tr("Se connecter", "Log in")}
              </BoutonPilule>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
