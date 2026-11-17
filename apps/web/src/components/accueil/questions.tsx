"use client";

import { MARQUE } from "@bdt/shared";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuPlus } from "react-icons/lu";

/** Questions fréquentes : réponses tirées uniquement de la spécification. */
const QUESTIONS = [
  {
    q: "Est-ce que la plateforme me trouve un emploi ?",
    r: `Non, et nous préférons être clairs dès le départ. ${MARQUE.avertissement}`,
  },
  {
    q: "Je n'ai pas de diplôme. Est-ce que je peux m'inscrire ?",
    r: "Oui. Ton expérience compte : tu peux obtenir le grade D, et le cabinet te propose les services qui renforcent ton profil.",
  },
  {
    q: "Je n'ai pas d'adresse e-mail.",
    r: "Ce n'est pas un problème : tu peux créer ton compte avec ton numéro de téléphone. En cas d'oubli du mot de passe, le cabinet t'aide à le changer.",
  },
  {
    q: "Qui peut voir mes informations ?",
    r: "Le cabinet voit ton dossier complet pour le vérifier. Un recruteur ne voit jamais ton téléphone, ton e-mail, ton adresse ni tes documents, et seulement si tu as accepté d'être présenté.",
  },
  {
    q: "Mon grade peut-il changer ?",
    r: "Oui. Il est recalculé à chaque fois que ton dossier évolue : un test de langue réussi, un coaching terminé, une pièce vérifiée… Il est d'abord provisoire, puis confirmé par le cabinet.",
  },
  {
    q: "Puis-je supprimer mon dossier ?",
    r: "Oui, à tout moment, depuis ton espace. Le cabinet efface alors ton compte, ton dossier et tes documents.",
  },
];

export function Questions() {
  const [ouverte, setOuverte] = useState<number | null>(0);
  return (
    <Stack gap="3">
      {QUESTIONS.map(({ q, r }, i) => {
        const estOuverte = ouverte === i;
        return (
          <Box
            key={q}
            bg="white"
            borderRadius="20px"
            borderWidth="1px"
            borderColor={estOuverte ? "emeraude.200" : "nuit/5"}
            boxShadow={estOuverte ? "0 12px 32px rgba(0, 109, 51, 0.10)" : "none"}
            transition="border-color 0.3s ease, box-shadow 0.3s ease"
          >
            <HStack
              as="button"
              w="full"
              textAlign="left"
              px={{ base: "5", md: "6" }}
              py="5"
              gap="4"
              cursor="pointer"
              aria-expanded={estOuverte}
              onClick={() => setOuverte(estOuverte ? null : i)}
            >
              <Text flex="1" fontWeight="600" color="nuit">
                {q}
              </Text>
              <Box
                flexShrink={0}
                w="9"
                h="9"
                borderRadius="full"
                display="grid"
                placeItems="center"
                bg={estOuverte ? "emeraude.600" : "brume"}
                color={estOuverte ? "white" : "nuit"}
                transition="transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease"
                transform={estOuverte ? "rotate(45deg)" : "none"}
              >
                <LuPlus />
              </Box>
            </HStack>
            <Box display="grid" gridTemplateRows={estOuverte ? "1fr" : "0fr"} transition="grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1)">
              <Box overflow="hidden">
                <Text px={{ base: "5", md: "6" }} pb="5" color="gris">
                  {r}
                </Text>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
