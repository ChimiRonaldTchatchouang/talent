"use client";

import { Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { Carte } from "@/components/carte";

const RACCOURCIS = [
  {
    href: "/admin/referentiels",
    titre: "Listes de référence",
    texte: "Domaines, compétences, tests de langue, services et diplômes.",
  },
  {
    href: "/admin/parametres",
    titre: "Paramètres du classement",
    texte: "Seuils utilisés pour calculer les grades provisoires.",
  },
  { href: "/admin/administrateurs", titre: "Administrateurs", texte: "Comptes de l'équipe du cabinet." },
];

export default function TableauDeBord() {
  return (
    <Stack gap="6">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          Tableau de bord
        </Heading>
        <Text color="gris">
          Les compteurs du vivier (profils par grade, dossiers à vérifier) apparaîtront ici dès que les candidats
          pourront s&apos;inscrire.
        </Text>
      </Stack>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        {RACCOURCIS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Carte h="full" _hover={{ boxShadow: "lg" }} transition="box-shadow 0.2s">
              <Heading as="h2" size="md" color="nuit" mb="2">
                {r.titre}
              </Heading>
              <Text color="gris">{r.texte}</Text>
            </Carte>
          </Link>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
