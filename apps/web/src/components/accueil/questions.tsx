"use client";

import { MARQUE } from "@bdt/shared";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useLangue } from "@/lib/preferences";

/** Questions fréquentes : réponses tirées uniquement de la spécification. */
const QUESTIONS: { q: [string, string]; r: [string, string] }[] = [
  {
    q: ["Est-ce que la plateforme me trouve un emploi ?", "Will the platform find me a job?"],
    r: [
      `Non, et nous préférons être clairs dès le départ. ${MARQUE.avertissement}`,
      "No, and we prefer to be clear from the start. This platform does not promise a job, a visa or departure. It helps you prepare and be introduced to recruiters.",
    ],
  },
  {
    q: ["Je n'ai pas de diplôme. Est-ce que je peux m'inscrire ?", "I don't have a degree. Can I sign up?"],
    r: [
      "Oui. Ton expérience compte : tu peux obtenir le grade D, et le cabinet te propose les services qui renforcent ton profil.",
      "Yes. Your experience counts: you can get grade D, and the agency offers services that strengthen your profile.",
    ],
  },
  {
    q: ["Je n'ai pas d'adresse e-mail.", "I don't have an email address."],
    r: [
      "Ce n'est pas un problème : tu peux créer ton compte avec ton numéro de téléphone. En cas d'oubli du mot de passe, le cabinet t'aide à le changer.",
      "That's not a problem: you can create your account with your phone number. If you forget your password, the agency helps you change it.",
    ],
  },
  {
    q: ["Qui peut voir mes informations ?", "Who can see my information?"],
    r: [
      "Le cabinet voit ton dossier complet pour le vérifier. Un recruteur ne voit jamais ton téléphone, ton e-mail, ton adresse ni tes documents, et seulement si tu as accepté d'être présenté.",
      "The agency sees your full file to verify it. A recruiter never sees your phone, email, address or documents, and only if you have agreed to be introduced.",
    ],
  },
  {
    q: ["Mon grade peut-il changer ?", "Can my grade change?"],
    r: [
      "Oui. Il est recalculé à chaque fois que ton dossier évolue : un test de langue réussi, un coaching terminé, une pièce vérifiée… Il est d'abord provisoire, puis confirmé par le cabinet.",
      "Yes. It is recalculated every time your file changes: a language test passed, coaching completed, a document verified… It is provisional at first, then confirmed by the agency.",
    ],
  },
  {
    q: ["Puis-je supprimer mon dossier ?", "Can I delete my file?"],
    r: [
      "Oui, à tout moment, depuis ton espace. Le cabinet efface alors ton compte, ton dossier et tes documents.",
      "Yes, at any time, from your space. The agency then erases your account, your file and your documents.",
    ],
  },
];

export function Questions() {
  const [ouverte, setOuverte] = useState<number | null>(0);
  const { tr } = useLangue();
  return (
    <Stack gap="3">
      {QUESTIONS.map(({ q, r }, i) => {
        const estOuverte = ouverte === i;
        return (
          <Box
            key={q[0]}
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
                {tr(...q)}
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
                  {tr(...r)}
                </Text>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
