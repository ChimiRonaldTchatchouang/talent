"use client";

import { Box, Button, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuCheck, LuTrophy } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { CarteService, LigneElement } from "@/components/candidat/grade";
import { api } from "@/lib/api";
import { useLibelles } from "@/lib/libelles";
import { useLangue } from "@/lib/preferences";
import type { Classement } from "@/lib/types";

/** Les services du cabinet qui comblent ce qui manque pour atteindre le grade A. */
export default function Services() {
  const { tr } = useLangue();
  const l = useLibelles();
  const [c, setC] = useState<Classement | null>(null);

  useEffect(() => {
    api<Classement>("/candidat/classement").then(setC).catch(() => undefined);
  }, []);

  if (!c) return <Spinner color="emeraude.600" />;
  const faits = c.elements.filter((e) => e.acquis).length;
  const suggeres = c.services.filter((s) => s.suggere);
  const autres = c.services.filter((s) => !s.suggere);

  return (
    <Stack gap="5">
      <Stack gap="1" className="bdt-page">
        <Heading as="h1" size="2xl" color="titre">
          {tr("Passer au grade A", "Reach grade A")}
        </Heading>
        <Text color="gris">
          {tr(
            "Le grade A réunit quatre éléments. Pour chacun de ceux qui te manquent, le cabinet propose un service.",
            "Grade A brings four elements together. For each one you're missing, the agency offers a service.",
          )}
        </Text>
      </Stack>

      {c.disponible ? (
        <Carte bg="nuit" color="white" position="relative" overflow="hidden">
          <Box position="absolute" right="-8" bottom="-12" w="36" h="36" borderRadius="full" bg="menthe" opacity="0.12" />
          <HStack gap="4" position="relative">
            <PastilleGrade grade={c.grade} taille="lg" />
            <Box flex="1">
              <Text fontWeight="700" fontSize="lg">
                {c.grade === "A" ? tr("Tu as le grade A 🎉", "You have grade A 🎉") : `${l.nomGrade(c.grade)} · ${l.grade(c.grade)}`}
              </Text>
              <Text fontSize="sm" color="whiteAlpha.800">
                {tr(`${faits} élément(s) sur 4 réunis`, `${faits} of 4 elements achieved`)}
              </Text>
            </Box>
            <Box fontSize="3xl" color="menthe">
              <LuTrophy />
            </Box>
          </HStack>
          <HStack gap="1.5" mt="4" position="relative">
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} flex="1" h="2" borderRadius="full" bg={i < faits ? "menthe" : "whiteAlpha.300"} transition="background-color 0.4s ease" />
            ))}
          </HStack>
        </Carte>
      ) : (
        <Carte>
          <Text color="gris">
            {tr("Termine les étapes de ton dossier pour connaître ton grade et ce qui te manque.", "Complete your file steps to find out your grade and what you're missing.")}
          </Text>
          <Button asChild mt="3" colorPalette="emeraude">
            <Link href="/candidat">{tr("Continuer mon dossier", "Continue my file")}</Link>
          </Button>
        </Carte>
      )}

      {c.disponible && (
        <Stack gap="2">
          <Text fontWeight="700" color="titre">
            {tr("Les 4 éléments du grade A", "The 4 elements of grade A")}
          </Text>
          {c.elements.map((e) => (
            <LigneElement key={e.element} e={e} />
          ))}
        </Stack>
      )}

      {suggeres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="titre">
            {tr("Recommandés pour toi", "Recommended for you")}
          </Text>
          {suggeres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}

      {c.disponible && suggeres.length === 0 && c.grade === "A" && (
        <HStack gap="3" bg="menthe" color="nuit" borderRadius="carte" p="4">
          <LuCheck />
          <Text fontWeight="600">{tr("Tu as tout réuni : aucun service n'est nécessaire pour ton grade.", "You have everything: no service is needed for your grade.")}</Text>
        </HStack>
      )}

      {autres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="titre">
            {tr("Les autres services du cabinet", "Other agency services")}
          </Text>
          {autres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
