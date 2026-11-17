"use client";

import { Box, Button, Container, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LuArrowRight, LuCheck, LuDownload, LuEllipsisVertical, LuHouse, LuShare, LuSquarePlus, LuWifiOff, LuZap } from "react-icons/lu";
import { BasculeLangue } from "@/components/accueil/entete";
import { Logo } from "@/components/marque";
import { toaster } from "@/components/toaster";
import { useInstallation } from "@/lib/installation";
import { useLangue } from "@/lib/preferences";

function Etape({ n, icone, children }: { n: number; icone: ReactNode; children: ReactNode }) {
  return (
    <HStack className="bdt-ligne-liste" style={{ ["--bdt-delai" as string]: `${n * 120}ms` }} gap="3" bg="white" borderRadius="18px" p="4" boxShadow="carte" align="center">
      <Box w="9" h="9" borderRadius="full" bg="nuit" color="menthe" display="grid" placeItems="center" fontWeight="700" flexShrink={0}>
        {n}
      </Box>
      <Text flex="1" color="encre">
        {children}
      </Text>
      <Box fontSize="xl" color="emeraude.600">
        {icone}
      </Box>
    </HStack>
  );
}

/**
 * Page d'installation de l'application (lien de l'e-mail de bienvenue) : un raccourci sur l'écran d'accueil.
 * Android / Chrome : le bouton ouvre l'invitation du navigateur. iPhone : les étapes dans Safari.
 */
export default function Installer() {
  const { tr } = useLangue();
  const { plateforme, installer } = useInstallation();

  async function lancer() {
    const ok = await installer();
    if (ok) toaster.create({ type: "success", title: tr("L'application est installée sur ton écran d'accueil.", "The app is installed on your home screen.") });
  }

  return (
    <Box minH="100dvh" bgGradient="to-b" gradientFrom="#EAFBF0" gradientTo="fond">
      <Container maxW="lg" py="6">
        <HStack justify="space-between" mb="8">
          <Link href="/">
            <Logo />
          </Link>
          <BasculeLangue />
        </HStack>

        <Stack gap="6" className="bdt-page">
          {/* Icône de l'application, comme sur un écran d'accueil */}
          <Box mx="auto" position="relative">
            <Box className="bdt-respiration" position="absolute" inset="-18px" borderRadius="36px" bg="menthe/50" />
            <Box position="relative" w="24" h="24" borderRadius="26px" bg="nuit" color="menthe" display="grid" placeItems="center" fontSize="3xl" fontWeight="700" boxShadow="0 18px 40px rgba(15, 42, 74, 0.3)">
              BT
            </Box>
          </Box>

          <Stack gap="2" textAlign="center">
            <Heading as="h1" fontSize={{ base: "28px", md: "34px" }} color="nuit" lineHeight="1.2">
              {tr("Installe l'application sur ton téléphone", "Install the app on your phone")}
            </Heading>
            <Text color="gris">
              {tr(
                "Un raccourci sur ton écran d'accueil, comme une vraie application. Pas de magasin d'applications, rien à payer.",
                "A shortcut on your home screen, just like a real app. No app store, nothing to pay.",
              )}
            </Text>
          </Stack>

          <HStack justify="center" gap="4" color="gris" fontSize="sm" wrap="wrap">
            <HStack gap="1.5">
              <LuZap /> <Text>{tr("Ouverture en un geste", "Opens in one tap")}</Text>
            </HStack>
            <HStack gap="1.5">
              <LuWifiOff /> <Text>{tr("Léger sur le réseau", "Light on data")}</Text>
            </HStack>
          </HStack>

          {plateforme === "installee" && (
            <Stack gap="4" bg="menthe" color="nuit" borderRadius="20px" p="5" textAlign="center">
              <HStack justify="center" gap="2" fontWeight="700">
                <LuCheck /> <Text>{tr("L'application est déjà installée.", "The app is already installed.")}</Text>
              </HStack>
              <Button asChild bg="nuit" color="white" size="lg">
                <Link href="/candidat">
                  {tr("Ouvrir mon espace", "Open my space")} <LuArrowRight />
                </Link>
              </Button>
            </Stack>
          )}

          {plateforme === "invitation" && (
            <Button size="lg" h="60px" colorPalette="emeraude" borderRadius="full" fontSize="lg" onClick={lancer}>
              <LuDownload /> {tr("Installer l'application", "Install the app")}
            </Button>
          )}

          {plateforme === "iphone" && (
            <Stack gap="3">
              <Text fontWeight="700" color="nuit">
                {tr("Sur iPhone, dans Safari :", "On iPhone, in Safari:")}
              </Text>
              <Etape n={1} icone={<LuShare />}>
                {tr("Touche le bouton Partager, en bas de l'écran.", "Tap the Share button at the bottom of the screen.")}
              </Etape>
              <Etape n={2} icone={<LuSquarePlus />}>
                {tr("Choisis « Sur l'écran d'accueil ».", "Choose \"Add to Home Screen\".")}
              </Etape>
              <Etape n={3} icone={<LuHouse />}>
                {tr("Touche « Ajouter » : l'icône apparaît sur ton écran.", "Tap \"Add\": the icon appears on your screen.")}
              </Etape>
              <Text fontSize="sm" color="gris">
                {tr("Tu as ouvert ce lien dans une autre application (Gmail, WhatsApp) ? Ouvre-le d'abord dans Safari.", "Opened this link in another app (Gmail, WhatsApp)? Open it in Safari first.")}
              </Text>
            </Stack>
          )}

          {(plateforme === "android" || plateforme === "autre") && (
            <Stack gap="3">
              <Text fontWeight="700" color="nuit">
                {plateforme === "android" ? tr("Sur Android, dans Chrome :", "On Android, in Chrome:") : tr("Dans ton navigateur :", "In your browser:")}
              </Text>
              <Etape n={1} icone={<LuEllipsisVertical />}>
                {tr("Touche le menu ⋮ en haut à droite.", "Tap the ⋮ menu at the top right.")}
              </Etape>
              <Etape n={2} icone={<LuSquarePlus />}>
                {tr("Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».", "Choose \"Install app\" or \"Add to Home screen\".")}
              </Etape>
              <Etape n={3} icone={<LuHouse />}>
                {tr("Confirme : l'icône apparaît sur ton écran.", "Confirm: the icon appears on your screen.")}
              </Etape>
              <Text fontSize="sm" color="gris">
                {tr("Le lien s'est ouvert dans Gmail ou WhatsApp ? Ouvre-le dans Chrome.", "Did the link open in Gmail or WhatsApp? Open it in Chrome.")}
              </Text>
            </Stack>
          )}

          <Button asChild variant="plain" color="gris">
            <Link href="/candidat">{tr("Plus tard : aller à mon espace", "Later: go to my space")}</Link>
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
