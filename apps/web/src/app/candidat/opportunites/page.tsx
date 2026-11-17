"use client";

import { Box, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuBriefcaseBusiness, LuCalendar, LuChevronRight, LuLock, LuMapPin } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { api, messageErreur } from "@/lib/api";
import { formatDate, useLangue } from "@/lib/preferences";
import type { OffreCandidat } from "@/lib/types";


/** Liste des opportunités : toutes visibles, ouvertes seulement avec le grade requis (vérifié par l'API). */
export default function Opportunites() {
  const { tr, langue } = useLangue();
  const [donnees, setDonnees] = useState<{ grade: string | null; offres: OffreCandidat[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"toutes" | "ouvertes">("toutes");

  useEffect(() => {
    api<{ grade: string | null; offres: OffreCandidat[] }>("/candidat/offres")
      .then(setDonnees)
      .catch((e) => setErreur(messageErreur(e)));
  }, []);

  if (erreur) return <Text color="gris">{erreur}</Text>;
  if (!donnees) return <Spinner color="emeraude.600" />;
  const offres = filtre === "ouvertes" ? donnees.offres.filter((o) => o.accessible) : donnees.offres;
  const ouvertes = donnees.offres.filter((o) => o.accessible).length;

  return (
    <Stack gap="5">
      <Stack gap="1" className="bdt-page">
        <Heading as="h1" size="2xl" color="titre">
          {tr("Opportunités", "Opportunities")}
        </Heading>
        <Text color="gris">
          {tr(
            "Les offres publiées par le cabinet, pour la plupart à l'international. Chaque offre demande un grade minimum.",
            "Job offers published by the agency, mostly abroad. Each offer requires a minimum grade.",
          )}
        </Text>
      </Stack>

      <HStack gap="2" bg="surface" borderRadius="full" p="1" alignSelf="flex-start" boxShadow="carte">
        {(
          [
            ["toutes", tr(`Toutes (${donnees.offres.length})`, `All (${donnees.offres.length})`)],
            ["ouvertes", tr(`Pour mon grade (${ouvertes})`, `For my grade (${ouvertes})`)],
          ] as const
        ).map(([cle, libelle]) => (
          <Box
            key={cle}
            as="button"
            onClick={() => setFiltre(cle)}
            px="4"
            py="2"
            borderRadius="full"
            fontSize="sm"
            fontWeight="600"
            bg={filtre === cle ? "emeraude.600" : "transparent"}
            color={filtre === cle ? "white" : "gris"}
            transition="background-color 0.25s ease, color 0.25s ease"
          >
            {libelle}
          </Box>
        ))}
      </HStack>

      {offres.length === 0 ? (
        <Carte textAlign="center" py="10">
          <Box fontSize="4xl" color="gris" display="grid" placeItems="center" mb="2">
            <LuBriefcaseBusiness />
          </Box>
          <Text color="gris">
            {filtre === "ouvertes"
              ? tr("Aucune offre ouverte à ton grade pour l'instant.", "No offer open to your grade yet.")
              : tr("Aucune offre pour l'instant. Tu seras prévenu(e) dans tes notifications.", "No offers yet. You'll be notified in your alerts.")}
          </Text>
        </Carte>
      ) : (
        <Stack gap="3">
          {offres.map((o, i) => (
            <Link key={o.id} href={`/candidat/opportunites/${o.id}`}>
              <HStack
                className="bdt-cliquable bdt-ligne-liste"
                style={{ ["--bdt-delai" as string]: `${i * 60}ms` }}
                gap="3"
                bg="surface"
                borderRadius="20px"
                boxShadow="carte"
                p="4"
                align="flex-start"
                opacity={o.accessible ? 1 : 0.92}
                position="relative"
                overflow="hidden"
              >
                <Box position="relative">
                  <PastilleGrade grade={o.gradeRequis} />
                  {!o.accessible && (
                    <Box position="absolute" bottom="-1" right="-1" w="5" h="5" borderRadius="full" bg="nuit" color="white" display="grid" placeItems="center" fontSize="10px" borderWidth="2px" borderColor="surface">
                      <LuLock />
                    </Box>
                  )}
                </Box>
                <Stack gap="1" flex="1" minW="0">
                  <Text fontWeight="700" color="titre" lineClamp={2}>
                    {o.titre}
                  </Text>
                  <HStack gap="3" fontSize="sm" color="gris" wrap="wrap">
                    <HStack gap="1">
                      <LuMapPin /> <Text>{[o.ville, o.pays].filter(Boolean).join(", ")}</Text>
                    </HStack>
                    {o.typeContrat && <Text>{o.typeContrat}</Text>}
                    {o.dateLimite && (
                      <HStack gap="1">
                        <LuCalendar /> <Text>{tr("jusqu'au", "until")} {formatDate(o.dateLimite, langue, { day: "numeric", month: "short" })}</Text>
                      </HStack>
                    )}
                  </HStack>
                  <Text fontSize="xs" fontWeight="600" color={o.accessible ? "accent" : "orange.500"}>
                    {o.accessible
                      ? o.interesse
                        ? tr("✓ Tu es intéressé(e)", "✓ You're interested")
                        : tr("Ouverte à ton grade", "Open to your grade")
                      : tr(`Réservée au grade ${o.gradeRequis}${o.gradeRequis === "A" ? "" : " ou plus"}`, `Grade ${o.gradeRequis}${o.gradeRequis === "A" ? "" : " or higher"} only`)}
                  </Text>
                </Stack>
                <Box color="gris" alignSelf="center">
                  <LuChevronRight />
                </Box>
              </HStack>
            </Link>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
