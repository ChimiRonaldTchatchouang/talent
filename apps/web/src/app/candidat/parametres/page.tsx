"use client";

import { Box, Button, Heading, HStack, Spinner, Stack, Switch, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LuChevronRight, LuDownload, LuLanguages, LuLogOut, LuMoon, LuShieldCheck, LuTrash2, LuUserRound } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { useDossier } from "@/lib/dossier";
import { useLangue, usePreferences } from "@/lib/preferences";

function Ligne({ icone, titre, texte, children }: { icone: ReactNode; titre: string; texte?: string; children?: ReactNode }) {
  return (
    <HStack gap="3" py="3" align="center">
      <Box w="10" h="10" borderRadius="12px" bg="brume" color="titre" display="grid" placeItems="center" flexShrink={0} fontSize="lg">
        {icone}
      </Box>
      <Stack gap="0" flex="1" minW="0">
        <Text fontWeight="600" color="titre">
          {titre}
        </Text>
        {texte && (
          <Text fontSize="sm" color="gris">
            {texte}
          </Text>
        )}
      </Stack>
      {children}
    </HStack>
  );
}

export default function Parametres() {
  const router = useRouter();
  const { tr, langue, setLangue } = useLangue();
  const { sombre, basculerSombre } = usePreferences();
  const { reponse, setReponse } = useDossier();

  async function changerConsentement(valeur: boolean) {
    if (!reponse) return;
    try {
      await api("/candidat/consentements", { methode: "PUT", corps: { recruteurs: valeur } });
      setReponse({ ...reponse, dossier: { ...reponse.dossier, consentementRecruteurs: valeur } });
      toaster.create({
        type: "success",
        title: valeur
          ? tr("Ton profil pourra être présenté aux recruteurs.", "Your profile may be introduced to recruiters.")
          : tr("Ton profil ne sera plus présenté aux recruteurs.", "Your profile will no longer be introduced to recruiters."),
      });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function deconnecter() {
    await api("/auth/deconnexion", { methode: "POST" }).catch(() => undefined);
    router.replace("/");
  }

  return (
    <Stack gap="5">
      <Heading as="h1" size="2xl" color="titre" className="bdt-page">
        {tr("Paramètres", "Settings")}
      </Heading>

      <Carte py="2">
        <Text fontSize="xs" fontWeight="700" color="gris" textTransform="uppercase" letterSpacing="0.06em" pt="3">
          {tr("Affichage", "Display")}
        </Text>
        <Ligne icone={<LuLanguages />} titre={tr("Langue", "Language")} texte={tr("Français ou anglais", "French or English")}>
          <HStack gap="0" bg="brume" borderRadius="full" p="1">
            {(["fr", "en"] as const).map((l) => (
              <Box
                key={l}
                as="button"
                onClick={() => setLangue(l)}
                aria-pressed={langue === l}
                px="3"
                py="1.5"
                borderRadius="full"
                fontSize="sm"
                fontWeight="700"
                bg={langue === l ? "emeraude.600" : "transparent"}
                color={langue === l ? "white" : "gris"}
                transition="background-color 0.25s ease"
              >
                {l.toUpperCase()}
              </Box>
            ))}
          </HStack>
        </Ligne>
        <Ligne icone={<LuMoon />} titre={tr("Mode sombre", "Dark mode")} texte={tr("Plus doux pour les yeux le soir", "Easier on the eyes at night")}>
          <Switch.Root colorPalette="emeraude" checked={sombre} onCheckedChange={basculerSombre}>
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </Ligne>
      </Carte>

      <Link href="/installer">
        <HStack className="bdt-cliquable" gap="3" bg="emeraude.600" color="white" borderRadius="carte" p="4">
          <Box w="10" h="10" borderRadius="12px" bg="whiteAlpha.200" display="grid" placeItems="center" fontSize="lg">
            <LuDownload />
          </Box>
          <Stack gap="0" flex="1">
            <Text fontWeight="700">{tr("Installer l'application", "Install the app")}</Text>
            <Text fontSize="sm" color="whiteAlpha.900">
              {tr("Un raccourci sur ton écran d'accueil", "A shortcut on your home screen")}
            </Text>
          </Stack>
          <LuChevronRight />
        </HStack>
      </Link>

      <Carte py="2">
        <Text fontSize="xs" fontWeight="700" color="gris" textTransform="uppercase" letterSpacing="0.06em" pt="3">
          {tr("Confidentialité", "Privacy")}
        </Text>
        {!reponse ? (
          <Spinner color="emeraude.600" my="4" />
        ) : (
          <Ligne
            icone={<LuShieldCheck />}
            titre={tr("Présenter mon profil aux recruteurs", "Introduce my profile to recruiters")}
            texte={tr("Sans mes coordonnées ni mes documents.", "Without my contact details or documents.")}
          >
            <Switch.Root colorPalette="emeraude" checked={reponse.dossier.consentementRecruteurs} onCheckedChange={(e) => changerConsentement(e.checked)}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </Ligne>
        )}
        <Link href="/candidat/suppression">
          <Ligne icone={<LuTrash2 />} titre={tr("Supprimer mon dossier", "Delete my file")} texte={tr("Tes données sont effacées par le cabinet.", "Your data is erased by the agency.")}>
            <Box color="gris">
              <LuChevronRight />
            </Box>
          </Ligne>
        </Link>
      </Carte>

      <Carte py="2">
        <Text fontSize="xs" fontWeight="700" color="gris" textTransform="uppercase" letterSpacing="0.06em" pt="3">
          {tr("Compte", "Account")}
        </Text>
        <Link href="/candidat/etape/personnel">
          <Ligne icone={<LuUserRound />} titre={tr("Mes informations personnelles", "My personal information")}>
            <Box color="gris">
              <LuChevronRight />
            </Box>
          </Ligne>
        </Link>
      </Carte>

      <Button variant="outline" size="lg" color="#E5484D" borderColor="#E5484D" onClick={deconnecter}>
        <LuLogOut /> {tr("Se déconnecter", "Log out")}
      </Button>
    </Stack>
  );
}
