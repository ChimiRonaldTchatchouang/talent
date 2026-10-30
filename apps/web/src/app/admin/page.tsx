"use client";

import { GRADES, LIBELLES_GRADES } from "@bdt/shared";
import { Box, Heading, HStack, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { EnTete, EtatGrade, libelleGrade } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { ResumeCandidat } from "@/lib/types";

interface Tableau {
  grades: Record<(typeof GRADES)[number], number>;
  brouillons: number;
  piecesAVerifier: number;
  gradesAConfirmer: number;
  alertes: number;
  servicesInteresses: number;
  selectionsRecues: number;
  derniers: { id: string; nomComplet: string; ville: string | null; metier: string | null; envoyeLe: string; grade: ResumeCandidat["grade"]; etatGrade: ResumeCandidat["etatGrade"] }[];
}

function Tuile({ titre, valeur, href, accent }: { titre: string; valeur: number; href: string; accent?: boolean }) {
  return (
    <Link href={href}>
      <Carte h="full" bg={accent && valeur > 0 ? "nuit" : "white"} color={accent && valeur > 0 ? "white" : "encre"} _hover={{ boxShadow: "lg" }}>
        <Text fontSize="sm" color={accent && valeur > 0 ? "whiteAlpha.800" : "gris"}>
          {titre}
        </Text>
        <Text fontSize="3xl" fontWeight="700" color={accent && valeur > 0 ? "menthe" : "nuit"}>
          {valeur}
        </Text>
      </Carte>
    </Link>
  );
}

export default function TableauDeBord() {
  const [t, setT] = useState<Tableau | null>(null);
  useEffect(() => {
    api<Tableau>("/admin/tableau-de-bord").then(setT).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  if (!t) return <Spinner color="emeraude.600" />;

  return (
    <Stack gap="6">
      <EnTete titre="Tableau de bord" sousTitre="Qui pouvez-vous présenter demain à un employeur, et que proposer aux autres ?" />

      <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} gap="3">
        {GRADES.map((g) => (
          <Link key={g} href={`/admin/vivier?grades=${g}`}>
            <Carte h="full" _hover={{ boxShadow: "lg" }}>
              <HStack gap="3">
                <PastilleGrade grade={g} />
                <Box>
                  <Text fontSize="2xl" fontWeight="700" color="nuit" lineHeight="1">
                    {t.grades[g]}
                  </Text>
                  <Text fontSize="xs" color="gris">
                    {LIBELLES_GRADES[g].libelle}
                  </Text>
                </Box>
              </HStack>
            </Carte>
          </Link>
        ))}
        <Carte>
          <Text fontSize="2xl" fontWeight="700" color="nuit" lineHeight="1">
            {t.brouillons}
          </Text>
          <Text fontSize="xs" color="gris">
            Brouillons (non envoyés)
          </Text>
        </Carte>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap="3">
        <Tuile titre="Pièces à vérifier" valeur={t.piecesAVerifier} href="/admin/verifications" accent />
        <Tuile titre="Grades provisoires à confirmer" valeur={t.gradesAConfirmer} href="/admin/vivier?etatGrade=PROVISOIRE&vue=liste" accent />
        <Tuile titre="Grades à revoir (dossier modifié)" valeur={t.alertes} href="/admin/vivier?alerte=true&vue=liste" accent />
        <Tuile titre="Candidats intéressés par un service" valeur={t.servicesInteresses} href="/admin/services" accent />
        <Tuile titre="Sélections de recruteurs reçues" valeur={t.selectionsRecues} href="/admin" />
      </SimpleGrid>

      <Carte>
        <Heading as="h2" size="md" color="nuit" mb="4">
          Derniers dossiers reçus
        </Heading>
        {t.derniers.length === 0 && <Text color="gris">Aucun dossier envoyé pour le moment.</Text>}
        <Stack gap="2">
          {t.derniers.map((d) => (
            <Link key={d.id} href={`/admin/candidats/${d.id}`}>
              <HStack bg="fond" borderRadius="carte" p="3" gap="3" _hover={{ bg: "brume" }}>
                {d.grade && <PastilleGrade grade={d.grade} taille="sm" />}
                <Box flex="1" minW="0">
                  <Text fontWeight="600" color="nuit" truncate>
                    {d.nomComplet}
                  </Text>
                  <Text fontSize="sm" color="gris" truncate>
                    {[d.metier, d.ville].filter(Boolean).join(" · ")} · {libelleGrade(d.grade)}
                  </Text>
                </Box>
                <EtatGrade etat={d.etatGrade} />
                <Text fontSize="sm" color="gris" display={{ base: "none", md: "block" }}>
                  {new Date(d.envoyeLe).toLocaleDateString("fr-FR")}
                </Text>
              </HStack>
            </Link>
          ))}
        </Stack>
      </Carte>
    </Stack>
  );
}
