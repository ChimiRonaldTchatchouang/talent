"use client";

import { Box, Container, Flex, HStack, Spinner, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { LuBell, LuBriefcaseBusiness, LuHouse, LuMoon, LuSettings, LuSparkles, LuSun } from "react-icons/lu";
import { ContexteNotifications } from "@/components/candidat/contexte-notifications";
import { Logo } from "@/components/marque";
import { api } from "@/lib/api";
import { useLangue, usePreferences } from "@/lib/preferences";
import { useSession } from "@/lib/session";

/** Bouton rond de la barre du haut (langue, mode sombre). */
function BoutonRond({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      h="10"
      minW="10"
      px="2.5"
      borderRadius="full"
      bg="whiteAlpha.150"
      color="white"
      display="grid"
      placeItems="center"
      fontWeight="700"
      fontSize="sm"
      transition="background-color 0.2s ease, transform 0.2s ease"
      _hover={{ bg: "whiteAlpha.300" }}
      _active={{ transform: "scale(0.92)" }}
    >
      {children}
    </Box>
  );
}

export default function MiseEnPageCandidat({ children }: { children: ReactNode }) {
  const utilisateur = useSession("CANDIDAT");
  const chemin = usePathname();
  const { langue, setLangue, tr } = useLangue();
  const { sombre, basculerSombre } = usePreferences();
  const [nonLues, setNonLues] = useState(0);

  const rafraichir = useCallback(() => {
    api<{ nonLues: number }>("/candidat/notifications")
      .then((r) => setNonLues(r.nonLues))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (utilisateur) rafraichir();
  }, [utilisateur, chemin, rafraichir]);

  const ONGLETS = [
    { href: "/candidat", libelle: tr("Accueil", "Home"), icone: LuHouse, actif: chemin === "/candidat" || chemin.startsWith("/candidat/etape") || chemin.startsWith("/candidat/justificatifs") || chemin.startsWith("/candidat/recapitulatif") || chemin.startsWith("/candidat/grade") },
    { href: "/candidat/services", libelle: tr("Services", "Services"), icone: LuSparkles, actif: chemin.startsWith("/candidat/services") },
    { href: "/candidat/opportunites", libelle: tr("Opportunités", "Jobs"), icone: LuBriefcaseBusiness, actif: chemin.startsWith("/candidat/opportunites") },
    { href: "/candidat/notifications", libelle: tr("Notifications", "Alerts"), icone: LuBell, actif: chemin.startsWith("/candidat/notifications"), badge: nonLues },
    { href: "/candidat/parametres", libelle: tr("Paramètres", "Settings"), icone: LuSettings, actif: chemin.startsWith("/candidat/parametres") || chemin.startsWith("/candidat/suppression") },
  ];

  if (!utilisateur) {
    return (
      <Box minH="100dvh" display="grid" placeItems="center">
        <Spinner color="emeraude.600" size="lg" />
      </Box>
    );
  }

  return (
    <ContexteNotifications.Provider value={{ nonLues, rafraichir }}>
      <Flex className={sombre ? "bdt-sombre" : undefined} direction="column" minH="100dvh" bg="fond" color="encre" transition="background-color 0.3s ease">
        {/* Barre du haut : logo, langue, mode sombre */}
        <Box as="header" bg="nuit" color="white" borderBottomRadius="24px" position="sticky" top="0" zIndex="20" boxShadow="0 8px 24px rgba(11, 22, 38, 0.18)">
          <Container maxW="2xl" py="3">
            <Flex justify="space-between" align="center">
              <Link href="/candidat" aria-label={tr("Accueil", "Home")}>
                <Logo clair />
              </Link>
              <HStack gap="2">
                <BoutonRond label={tr("Passer en anglais", "Switch to French")} onClick={() => setLangue(langue === "fr" ? "en" : "fr")}>
                  {langue === "fr" ? "EN" : "FR"}
                </BoutonRond>
                <BoutonRond label={sombre ? tr("Mode clair", "Light mode") : tr("Mode sombre", "Dark mode")} onClick={basculerSombre}>
                  <Box className="bdt-rotation-icone" key={String(sombre)}>
                    {sombre ? <LuSun /> : <LuMoon />}
                  </Box>
                </BoutonRond>
              </HStack>
            </Flex>
          </Container>
        </Box>

        <Container as="main" maxW="2xl" pt="6" pb="28" flex="1">
          {children}
          <Text fontSize="sm" color="gris" textAlign="center" mt="10">
            {tr(
              "La plateforme ne promet ni emploi, ni visa, ni départ. Elle t'aide à te préparer et à être présenté aux recruteurs.",
              "This platform does not promise a job, a visa or departure. It helps you prepare and be introduced to recruiters.",
            )}
          </Text>
        </Container>

        {/* Barre d'onglets, comme une application mobile */}
        <Box as="nav" aria-label={tr("Navigation", "Navigation")} position="fixed" bottom="0" left="0" right="0" zIndex="20" pb="env(safe-area-inset-bottom)" pointerEvents="none">
          <Container maxW="2xl" px="3" pb="3" pointerEvents="auto">
            <HStack
              justify="space-around"
              bg="surface"
              borderRadius="24px"
              boxShadow="0 -2px 30px rgba(11, 22, 38, 0.16)"
              borderWidth="1px"
              borderColor="brume"
              px="0.5"
              py="1.5"
              gap="0.5"
            >
              {ONGLETS.map(({ href, libelle, icone: Icone, actif, badge }) => (
                <Link key={href} href={href} style={{ flex: 1, minWidth: 0 }} aria-current={actif ? "page" : undefined}>
                  <Flex className="bdt-onglet" data-actif={actif} direction="column" align="center" gap="0.5" py="1.5" borderRadius="18px" position="relative">
                    <Box className="bdt-onglet-icone" position="relative" fontSize="22px" color={actif ? "accent" : "gris"}>
                      <Icone />
                      {!!badge && (
                        <Box position="absolute" top="-1.5" right="-2.5" minW="18px" h="18px" px="1" borderRadius="full" bg="#E5484D" color="white" fontSize="10px" fontWeight="700" display="grid" placeItems="center" borderWidth="2px" borderColor="surface">
                          {badge > 9 ? "9+" : badge}
                        </Box>
                      )}
                    </Box>
                    <Text fontSize={{ base: "10px", sm: "11px" }} letterSpacing="-0.01em" fontWeight={actif ? "700" : "500"} color={actif ? "accent" : "gris"} maxW="full" truncate>
                      {libelle}
                    </Text>
                  </Flex>
                </Link>
              ))}
            </HStack>
          </Container>
        </Box>
      </Flex>
    </ContexteNotifications.Provider>
  );
}
