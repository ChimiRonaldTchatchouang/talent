"use client";

import { GRADES } from "@bdt/shared";
import { Box, Button, Container, Heading, HStack, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { BadgeEtat, BadgeGrade, PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { Logo } from "@/components/marque";
import { COULEURS } from "@/theme";

const NUANCIER = [
  ["Bleu nuit", COULEURS.nuit, "Menus, titres"],
  ["Vert émeraude", COULEURS.emeraude, "Boutons d'action"],
  ["Vert menthe", COULEURS.menthe, "Validé, progression"],
  ["Fond clair", COULEURS.fond, "Fond des pages"],
  ["Bleu brume", COULEURS.brume, "Champs, encadrés"],
  ["Encre", COULEURS.encre, "Textes"],
] as const;

/** Page de démonstration des composants de base (lot 1). */
export default function Charte() {
  return (
    <Container maxW="5xl" py="10">
      <Stack gap="8">
        <Logo />
        <Heading as="h1" size="3xl" color="nuit">
          Charte graphique
        </Heading>

        <Carte>
          <Heading as="h2" size="lg" color="nuit" mb="4">
            Couleurs
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 3 }} gap="4">
            {NUANCIER.map(([nom, hex, usage]) => (
              <Stack key={nom} gap="2">
                <Box h="16" borderRadius="carte" bg={hex} borderWidth="1px" borderColor="blackAlpha.100" />
                <Text fontWeight="600">{nom}</Text>
                <Text fontSize="sm" color="gris">
                  {hex} · {usage}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Carte>

        <Carte>
          <Heading as="h2" size="lg" color="nuit" mb="4">
            Grades
          </Heading>
          <Stack gap="4">
            {GRADES.map((g) => (
              <HStack key={g} gap="4">
                <PastilleGrade grade={g} taille="lg" />
                <BadgeGrade grade={g} />
              </HStack>
            ))}
          </Stack>
        </Carte>

        <Carte>
          <Heading as="h2" size="lg" color="nuit" mb="4">
            Badges d&apos;état
          </Heading>
          <HStack wrap="wrap" gap="3">
            <BadgeEtat etat="VERIFIE" />
            <BadgeEtat etat="EN_ATTENTE" />
            <BadgeEtat etat="REFUSE" />
            <BadgeEtat etat="PROVISOIRE" />
            <BadgeEtat etat="CONFIRME" />
          </HStack>
        </Carte>

        <Carte>
          <Heading as="h2" size="lg" color="nuit" mb="4">
            Boutons et champs
          </Heading>
          <Stack gap="4" maxW="md">
            <Button size="lg" colorPalette="emeraude">
              Envoyer mon dossier
            </Button>
            <Button size="lg" variant="outline" colorPalette="emeraude">
              Modifier
            </Button>
            <Input size="lg" bg="brume" placeholder="Champ de saisie" />
          </Stack>
        </Carte>
      </Stack>
    </Container>
  );
}
