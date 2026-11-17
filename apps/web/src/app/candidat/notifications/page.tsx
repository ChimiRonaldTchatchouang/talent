"use client";

import { Box, Button, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuBadgeCheck, LuBell, LuBriefcaseBusiness, LuCheckCheck, LuFileWarning, LuLock, LuPartyPopper, LuSend } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { useNotificationsNonLues } from "@/components/candidat/contexte-notifications";
import { api } from "@/lib/api";
import { useLibelles } from "@/lib/libelles";
import { formatDate, useLangue } from "@/lib/preferences";
import type { NotificationCandidat } from "@/lib/types";

const ICONES: Record<string, typeof LuBell> = {
  BIENVENUE: LuPartyPopper,
  DOSSIER_ENVOYE: LuSend,
  PIECE_REFUSEE: LuFileWarning,
  GRADE_MIS_A_JOUR: LuBadgeCheck,
  NOUVELLE_OFFRE: LuBriefcaseBusiness,
  OFFRE_VERROUILLEE: LuLock,
};
const COULEURS: Record<string, string> = {
  PIECE_REFUSEE: "#E5484D",
  OFFRE_VERROUILLEE: "#D97706",
  GRADE_MIS_A_JOUR: "#006D33",
  NOUVELLE_OFFRE: "#006D33",
};

/** Il y a 5 min, 2 h, 3 j… */
function depuis(iso: string, en: boolean) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return en ? "just now" : "à l'instant";
  if (s < 3600) return en ? `${Math.floor(s / 60)} min ago` : `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return en ? `${Math.floor(s / 3600)} h ago` : `il y a ${Math.floor(s / 3600)} h`;
  return null;
}

export default function Notifications() {
  const { tr, langue } = useLangue();
  const l = useLibelles();
  const { rafraichir } = useNotificationsNonLues();
  const [liste, setListe] = useState<NotificationCandidat[] | null>(null);

  useEffect(() => {
    api<{ notifications: NotificationCandidat[] }>("/candidat/notifications")
      .then((r) => {
        setListe(r.notifications);
        // Ouvrir l'écran marque tout comme lu (les nouvelles restent mises en avant jusqu'au prochain passage).
        if (r.notifications.some((n) => !n.lue)) api("/candidat/notifications/lues", { methode: "POST" }).then(rafraichir).catch(() => undefined);
      })
      .catch(() => setListe([]));
  }, [rafraichir]);

  /** Titre et texte dans la langue choisie (l'API garde la version française). */
  function contenu(n: NotificationCandidat): { titre: string; texte: string } {
    if (langue === "fr") return { titre: n.titre, texte: n.texte };
    const d = (n.donnees ?? {}) as Record<string, string | number | boolean>;
    switch (n.type) {
      case "BIENVENUE":
        return { titre: "Welcome to the platform", texte: "Install the app on your phone to find it in one tap, then fill in your file." };
      case "DOSSIER_ENVOYE":
        return { titre: "Your file has been sent", texte: d.manquantes ? `You still have ${d.manquantes} document(s) to upload.` : "The agency will review it and confirm your grade." };
      case "PIECE_REFUSEE":
        return { titre: "A document needs to be uploaded again", texte: `${d.piece ? l.piece(d.piece as never) : ""} : ${d.motif ?? ""}` };
      case "GRADE_MIS_A_JOUR":
        return { titre: d.corrige ? "The agency has set your grade" : "The agency has confirmed your grade", texte: `${l.nomGrade(d.grade as never)}: open your space to see the details.` };
      case "NOUVELLE_OFFRE":
        return { titre: "New opportunity for your profile", texte: `${d.titre} (${d.pays})` };
      case "OFFRE_VERROUILLEE":
        return {
          titre: `Offer reserved for grade ${d.gradeRequis}${d.gradeRequis === "A" ? "" : " or higher"}`,
          texte:
            d.blocage === "DOSSIER_NON_ENVOYE"
              ? "Complete and send your file to access opportunities."
              : d.blocage === "GRADE_NON_CONFIRME"
                ? "Your grade must first be confirmed by the agency to open this offer."
                : `Reach grade ${d.gradeRequis} to view this offer. The agency's services can help you.`,
        };
      default:
        return { titre: n.titre, texte: n.texte };
    }
  }

  return (
    <Stack gap="5">
      <HStack justify="space-between" className="bdt-page">
        <Heading as="h1" size="2xl" color="titre">
          {tr("Notifications", "Notifications")}
        </Heading>
        {liste && liste.length > 0 && (
          <HStack gap="1" color="gris" fontSize="sm">
            <LuCheckCheck /> <Text>{tr("Tout est lu", "All read")}</Text>
          </HStack>
        )}
      </HStack>

      {!liste ? (
        <Spinner color="emeraude.600" />
      ) : liste.length === 0 ? (
        <Carte textAlign="center" py="12">
          <Box className="bdt-cloche" fontSize="4xl" color="gris" display="grid" placeItems="center" mb="3">
            <LuBell />
          </Box>
          <Text color="gris">{tr("Aucune notification pour l'instant.", "No notifications yet.")}</Text>
        </Carte>
      ) : (
        <Stack gap="2">
          {liste.map((n, i) => {
            const Icone = ICONES[n.type] ?? LuBell;
            const { titre, texte } = contenu(n);
            const quand = depuis(n.creeLe, langue === "en") ?? formatDate(n.creeLe, langue, { day: "numeric", month: "short" });
            const carte = (
              <HStack
                className="bdt-cliquable bdt-ligne-liste"
                style={{ ["--bdt-delai" as string]: `${i * 50}ms` }}
                gap="3"
                align="flex-start"
                bg="surface"
                borderRadius="18px"
                boxShadow="carte"
                p="4"
                borderLeftWidth="4px"
                borderLeftColor={n.lue ? "transparent" : "emeraude.600"}
              >
                <Box w="10" h="10" borderRadius="full" bg="brume" color={COULEURS[n.type] ?? "titre"} display="grid" placeItems="center" flexShrink={0} fontSize="lg">
                  <Icone />
                </Box>
                <Stack gap="0.5" flex="1" minW="0">
                  <HStack justify="space-between" gap="2" align="flex-start">
                    <Text fontWeight={n.lue ? "600" : "700"} color="titre">
                      {titre}
                    </Text>
                    <Text fontSize="xs" color="gris" whiteSpace="nowrap">
                      {quand}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gris">
                    {texte}
                  </Text>
                </Stack>
              </HStack>
            );
            return n.lien ? (
              <Link key={n.id} href={n.lien}>
                {carte}
              </Link>
            ) : (
              <Box key={n.id}>{carte}</Box>
            );
          })}
        </Stack>
      )}

      {liste && liste.some((n) => n.type === "OFFRE_VERROUILLEE") && (
        <Button asChild colorPalette="emeraude" variant="outline">
          <Link href="/candidat/services">{tr("Voir les services pour passer au grade A", "See services to reach grade A")}</Link>
        </Button>
      )}
    </Stack>
  );
}
