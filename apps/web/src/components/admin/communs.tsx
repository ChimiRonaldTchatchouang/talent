"use client";

import { LIBELLES_GRADES } from "@bdt/shared";
import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeEtat, PastilleGrade } from "@/components/badges";
import type { ResumeCandidat } from "@/lib/types";

export function EnTete({ titre, sousTitre, actions }: { titre: string; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "flex-end" }} gap="3">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          {titre}
        </Heading>
        {sousTitre && <Text color="gris">{sousTitre}</Text>}
      </Stack>
      {actions && <HStack gap="2" wrap="wrap">{actions}</HStack>}
    </Stack>
  );
}

/** Marque bien visible des données de démonstration. */
export function BadgeDemo() {
  return (
    <Box as="span" bg="#FEF3C7" color="#92400E" borderRadius="full" px="2" py="0.5" fontSize="xs" fontWeight="700" ml="1">
      DÉMO
    </Box>
  );
}

export function libelleGrade(g: ResumeCandidat["grade"]) {
  if (!g) return "Sans grade";
  return g === "HORS_BASSIN" ? "Hors bassin" : `Grade ${g}`;
}

/** Badge provisoire / confirmé / corrigé, avec l'alerte « à revoir ». */
export function EtatGrade({ etat, alerte }: { etat: ResumeCandidat["etatGrade"]; alerte?: boolean }) {
  if (!etat) return null;
  return (
    <HStack gap="1">
      <BadgeEtat etat={etat === "PROVISOIRE" ? "PROVISOIRE" : "CONFIRME"} />
      {etat === "CORRIGE" && (
        <Text fontSize="xs" color="gris">
          (corrigé)
        </Text>
      )}
      {alerte && (
        <Box bg="#FEF3C7" color="#92400E" borderRadius="full" px="2" py="0.5" fontSize="xs" fontWeight="600">
          À revoir
        </Box>
      )}
    </HStack>
  );
}

/** Carte d'un candidat dans les colonnes du classement (W7). */
export function CarteCandidat({ c }: { c: ResumeCandidat }) {
  return (
    <Link href={`/admin/candidats/${c.id}`}>
      <Stack gap="2" bg="white" borderRadius="carte" p="3" boxShadow="carte" _hover={{ boxShadow: "md" }}>
        <HStack gap="3">
          <Box w="9" h="9" borderRadius="full" bg="brume" color="nuit" display="grid" placeItems="center" fontWeight="700" fontSize="sm" flexShrink={0}>
            {c.initiales}
          </Box>
          <Box minW="0">
            <Text fontWeight="700" color="nuit" truncate>
              {c.nomComplet}
              {c.demo && <BadgeDemo />}
            </Text>
            <Text fontSize="xs" color="gris" truncate>
              {[c.metier, c.ville].filter(Boolean).join(" · ") || "—"}
            </Text>
          </Box>
        </HStack>
        <EtatGrade etat={c.etatGrade} alerte={c.alerte} />
        {c.manques.length > 0 && (
          <Text fontSize="xs" color="gris">
            Manque : {c.manques.join(", ")}
          </Text>
        )}
        {c.piecesAVerifier > 0 && (
          <Text fontSize="xs" color="emeraude.700" fontWeight="600">
            {c.piecesAVerifier} pièce(s) à vérifier
          </Text>
        )}
      </Stack>
    </Link>
  );
}

export function TitreGrade({ grade, nombre }: { grade: NonNullable<ResumeCandidat["grade"]>; nombre: number }) {
  return (
    <HStack gap="2">
      <PastilleGrade grade={grade} taille="sm" />
      <Text fontWeight="700" color="nuit">
        {LIBELLES_GRADES[grade].libelle}
      </Text>
      <Text color="gris">({nombre})</Text>
    </HStack>
  );
}
