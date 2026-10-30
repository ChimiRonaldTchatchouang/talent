"use client";

import { MARQUE } from "@bdt/shared";
import { Box, Button, Container, Flex, Spinner, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LuLogOut } from "react-icons/lu";
import { Logo } from "@/components/marque";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function MiseEnPageCandidat({ children }: { children: ReactNode }) {
  const utilisateur = useSession("CANDIDAT");
  const router = useRouter();

  async function deconnecter() {
    await api("/auth/deconnexion", { methode: "POST" }).catch(() => undefined);
    router.replace("/");
  }

  if (!utilisateur) {
    return (
      <Box minH="100dvh" display="grid" placeItems="center">
        <Spinner color="emeraude.600" size="lg" />
      </Box>
    );
  }

  return (
    <Flex direction="column" minH="100dvh" bg="fond">
      <Box as="header" bg="nuit" color="white" borderBottomRadius="24px">
        <Container maxW="2xl" py="4">
          <Flex justify="space-between" align="center">
            <Link href="/candidat" aria-label="Mon dossier">
              <Logo clair />
            </Link>
            <Button variant="ghost" size="sm" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={deconnecter}>
              <LuLogOut /> Quitter
            </Button>
          </Flex>
        </Container>
      </Box>
      <Container as="main" maxW="2xl" py="6" flex="1">
        {children}
      </Container>
      <Box as="footer" py="6">
        <Container maxW="2xl">
          <Text fontSize="sm" color="gris" textAlign="center">
            {MARQUE.avertissement}
          </Text>
        </Container>
      </Box>
    </Flex>
  );
}
