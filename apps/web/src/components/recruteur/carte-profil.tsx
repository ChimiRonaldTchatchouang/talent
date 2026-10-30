"use client";

import { LIBELLES_GRADES } from "@bdt/shared";
import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { LuCheck, LuPlus } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import type { ProfilAnonyme } from "@/lib/types";

export function Badges({ p }: { p: ProfilAnonyme }) {
  const liste = [
    p.badges.diplomeVerifie && "Diplôme vérifié",
    p.badges.testVerifie && "Test de langue vérifié",
    p.badges.coache && "Coaché par le cabinet",
    p.badges.passeportValide && "Passeport valide",
  ].filter(Boolean) as string[];
  if (!liste.length) return null;
  return (
    <HStack gap="1" wrap="wrap">
      {liste.map((b) => (
        <Badge key={b} bg="menthe" color="nuit" borderRadius="full" px="2" fontSize="xs">
          <LuCheck /> {b}
        </Badge>
      ))}
    </HStack>
  );
}

/** Carte d'un profil anonymisé dans la liste du recruteur. */
export function CarteProfil({ p, onBasculer, occupe }: { p: ProfilAnonyme; onBasculer: () => void; occupe?: boolean }) {
  return (
    <Stack gap="3" bg="white" borderRadius="carte" p="4" boxShadow="carte" borderWidth="2px" borderColor={p.dansSelection ? "emeraude.600" : "transparent"}>
      <HStack gap="3" align="flex-start">
        {p.grade && <PastilleGrade grade={p.grade} />}
        <Box flex="1" minW="0">
          <Link href={`/recruteur/profils/${p.id}`}>
            <Text fontWeight="700" color="nuit" _hover={{ textDecoration: "underline" }}>
              {p.nom}
            </Text>
          </Link>
          <Text fontSize="sm" color="gris">
            {[p.metier, p.domaine].filter(Boolean).join(" · ") || "—"}
          </Text>
          {p.grade && (
            <Text fontSize="xs" color="gris">
              Grade {p.grade === "HORS_BASSIN" ? "hors bassin" : p.grade} · {LIBELLES_GRADES[p.grade].libelle}
            </Text>
          )}
        </Box>
      </HStack>
      <Text fontSize="sm">
        {[p.experience && `Expérience : ${p.experience}`, p.niveauDiplome && `Diplôme : ${p.niveauDiplome}`].filter(Boolean).join(" · ")}
      </Text>
      <Text fontSize="sm" color="gris">
        Langues : {p.langues.join(", ") || "—"}
        {p.testLangue && ` · ${p.testLangue.nom}${p.testLangue.score !== null ? ` ${p.testLangue.score}` : ""}`}
      </Text>
      <Badges p={p} />
      <HStack gap="2">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/recruteur/profils/${p.id}`}>Voir la fiche</Link>
        </Button>
        <Button size="sm" colorPalette="emeraude" variant={p.dansSelection ? "outline" : "solid"} loading={occupe} onClick={onBasculer}>
          {p.dansSelection ? "Retirer de ma sélection" : (
            <>
              <LuPlus /> Ajouter à ma sélection
            </>
          )}
        </Button>
      </HStack>
    </Stack>
  );
}
