"use client";

import { Box, Button, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LuBriefcase, LuScrollText, LuTrash2, LuFileCheck, LuHandHelping, LuInbox, LuLayoutDashboard, LuListChecks, LuLogOut, LuSettings, LuSlidersHorizontal, LuUsers, LuUsersRound } from "react-icons/lu";
import { Logo } from "@/components/marque";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

const MENU = [
  { href: "/admin", libelle: "Tableau de bord", icone: LuLayoutDashboard },
  { href: "/admin/vivier", libelle: "Vivier", icone: LuUsersRound },
  { href: "/admin/verifications", libelle: "Pièces à vérifier", icone: LuFileCheck },
  { href: "/admin/services", libelle: "Services", icone: LuHandHelping },
  { href: "/admin/recruteurs", libelle: "Recruteurs", icone: LuBriefcase },
  { href: "/admin/selections", libelle: "Sélections reçues", icone: LuInbox },
  { href: "/admin/referentiels", libelle: "Listes de référence", icone: LuListChecks },
  { href: "/admin/parametres", libelle: "Paramètres", icone: LuSlidersHorizontal },
  { href: "/admin/administrateurs", libelle: "Administrateurs", icone: LuUsers },
  { href: "/admin/reglages", libelle: "Réglages et e-mails", icone: LuSettings },
  { href: "/admin/journal", libelle: "Journal", icone: LuScrollText },
  { href: "/admin/suppressions", libelle: "Suppressions", icone: LuTrash2 },
];

export default function MiseEnPageAdmin({ children }: { children: ReactNode }) {
  const utilisateur = useSession("ADMIN");
  const chemin = usePathname();
  const router = useRouter();

  async function deconnecter() {
    await api("/auth/deconnexion", { methode: "POST" }).catch(() => undefined);
    router.replace("/connexion");
  }

  if (!utilisateur) {
    return (
      <Box minH="100dvh" display="grid" placeItems="center">
        <Spinner color="emeraude.600" size="lg" />
      </Box>
    );
  }

  return (
    <Flex minH="100dvh" direction={{ base: "column", lg: "row" }}>
      <Box
        as="nav"
        bg="nuit"
        color="white"
        w={{ base: "full", lg: "260px" }}
        flexShrink={0}
        py={{ base: "4", lg: "8" }}
        borderBottomRightRadius={{ lg: "28px" }}
        position={{ lg: "sticky" }}
        top="0"
        h={{ lg: "100dvh" }}
      >
        <Box px="6" mb={{ base: "4", lg: "10" }}>
          <Logo clair />
        </Box>
        <Stack gap="1" direction={{ base: "row", lg: "column" }} overflowX="auto" px={{ base: "4", lg: "0" }}>
          {MENU.map(({ href, libelle, icone: Icone }) => {
            const actif =
              href === "/admin" ? chemin === "/admin" : chemin.startsWith(href) || (href === "/admin/vivier" && chemin.startsWith("/admin/candidats"));
            return (
              <Link key={href} href={href}>
                <HStack
                  gap="3"
                  px="6"
                  py="3"
                  ml={{ lg: "4" }}
                  borderLeftRadius="full"
                  borderRightRadius={{ base: "full", lg: "0" }}
                  bg={actif ? "fond" : "transparent"}
                  color={actif ? "nuit" : "whiteAlpha.800"}
                  fontWeight={actif ? "600" : "500"}
                  whiteSpace="nowrap"
                  _hover={actif ? undefined : { bg: "whiteAlpha.100" }}
                >
                  <Icone aria-hidden />
                  <Text>{libelle}</Text>
                </HStack>
              </Link>
            );
          })}
        </Stack>
      </Box>

      <Box flex="1" minW="0">
        <Flex
          as="header"
          justify="flex-end"
          align="center"
          gap="4"
          px={{ base: "4", md: "8" }}
          py="4"
        >
          <Text color="gris" fontSize="sm">
            {utilisateur.nom ?? utilisateur.email}
          </Text>
          <Button variant="ghost" size="sm" onClick={deconnecter}>
            <LuLogOut /> Se déconnecter
          </Button>
        </Flex>
        <Box as="main" px={{ base: "4", md: "8" }} pb="12">
          {children}
        </Box>
      </Box>
    </Flex>
  );
}
