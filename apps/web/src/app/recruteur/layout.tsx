"use client";

import { Box, Button, Container, Flex, HStack, Spinner, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { LuLogOut } from "react-icons/lu";
import { Logo } from "@/components/marque";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Acces {
  entreprise: string;
  pays: string;
  dateFin: string;
}

export default function MiseEnPageRecruteur({ children }: { children: ReactNode }) {
  const utilisateur = useSession("RECRUTEUR");
  const router = useRouter();
  const chemin = usePathname();
  const [acces, setAcces] = useState<Acces | null>(null);

  useEffect(() => {
    if (utilisateur) api<Acces>("/recruteur/moi").then(setAcces).catch(() => undefined);
  }, [utilisateur]);

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
  const lien = (href: string, libelle: string) => {
    const actif = href === "/recruteur" ? chemin === "/recruteur" || chemin.startsWith("/recruteur/profils") : chemin.startsWith(href);
    return (
      <Link href={href}>
        <Box px="4" py="2" borderRadius="full" bg={actif ? "fond" : "transparent"} color={actif ? "nuit" : "whiteAlpha.800"} fontWeight="600">
          {libelle}
        </Box>
      </Link>
    );
  };

  return (
    <Flex direction="column" minH="100dvh" bg="fond">
      <Box bg="nuit" color="white" borderBottomRadius="28px">
        <Container maxW="7xl" py="4">
          <Flex justify="space-between" align="center" gap="4" wrap="wrap">
            <HStack gap="6">
              <Logo clair />
              <HStack gap="1">
                {lien("/recruteur", "Profils")}
                {lien("/recruteur/selection", "Ma sélection")}
              </HStack>
            </HStack>
            <HStack gap="4">
              {acces && (
                <Text fontSize="sm" color="whiteAlpha.800">
                  {acces.entreprise} · accès jusqu&apos;au {new Date(`${acces.dateFin}T00:00:00`).toLocaleDateString("fr-FR")}
                </Text>
              )}
              <Button variant="ghost" size="sm" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={deconnecter}>
                <LuLogOut /> Se déconnecter
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Container as="main" maxW="7xl" py="8" flex="1">
        {children}
      </Container>
      <Box as="footer" py="6">
        <Text fontSize="xs" color="gris" textAlign="center">
          Profils anonymisés. Pour entrer en contact avec un candidat, envoyez votre sélection au cabinet.
        </Text>
      </Box>
    </Flex>
  );
}
