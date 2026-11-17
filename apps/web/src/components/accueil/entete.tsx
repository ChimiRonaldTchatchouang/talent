"use client";

import { Box, Container, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuMenu, LuX } from "react-icons/lu";
import { Logo } from "@/components/marque";
import { BoutonPilule } from "./elements";

const LIENS = [
  { href: "#etapes", libelle: "Comment ça marche" },
  { href: "#pourquoi", libelle: "Pourquoi nous" },
  { href: "#grades", libelle: "Les grades" },
  { href: "#services", libelle: "Services" },
  { href: "#questions", libelle: "Questions" },
];

/** En-tête collé en haut : transparent sur le bandeau, puis fond givré dès que la page défile. */
export function Entete() {
  const [defile, setDefile] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

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
          <Link href="/" aria-label="Accueil">
            <Logo />
          </Link>
          <HStack as="nav" gap="1" display={{ base: "none", lg: "flex" }} aria-label="Sections de la page">
            {LIENS.map(({ href, libelle }) => (
              <a key={href} href={href} className="bdt-lien-menu">
                {libelle}
              </a>
            ))}
          </HStack>
          <HStack gap="2">
            <Box display={{ base: "none", sm: "block" }}>
              <BoutonPilule href="/connexion" variante="clair" taille="petite" icone={null}>
                Se connecter
              </BoutonPilule>
            </Box>
            <Box display={{ base: "none", md: "block" }}>
              <BoutonPilule href="/inscription" taille="petite">
                Créer mon profil
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
              aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
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
                  {libelle}
                </Text>
              </a>
            ))}
            <Stack direction="row" gap="2" pt="2" wrap="wrap">
              <BoutonPilule href="/inscription">Créer mon profil</BoutonPilule>
              <BoutonPilule href="/connexion" variante="clair" icone={null}>
                Se connecter
              </BoutonPilule>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
