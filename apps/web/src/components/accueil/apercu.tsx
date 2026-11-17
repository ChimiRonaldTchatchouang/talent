"use client";

import { LIBELLES_GRADES } from "@bdt/shared";
import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { LuBadgeCheck, LuCheck, LuGraduationCap, LuHeartHandshake, LuLanguages, LuSparkles, LuWrench } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";

const ELEMENTS = [
  { icone: LuGraduationCap, nom: "Diplôme", fait: true },
  { icone: LuLanguages, nom: "Test de langue", fait: true },
  { icone: LuWrench, nom: "Niveau dans ton domaine", fait: true },
  { icone: LuHeartHandshake, nom: "Coaching", fait: false },
];

/**
 * Aperçu illustratif de l'espace candidat, dans un cadre de navigateur (à la place de la capture d'écran du modèle).
 * Les informations sont un exemple : aucune donnée réelle.
 */
export function ApercuEspace() {
  return (
    <Box className="bdt-apercu" bg="white" borderRadius="24px" boxShadow="0 30px 80px rgba(15, 42, 74, 0.18)" borderWidth="1px" borderColor="nuit/5" overflow="hidden" aria-label="Exemple d'espace candidat" role="img">
      {/* Barre du navigateur */}
      <HStack px="4" py="3" gap="2" bg="fond" borderBottomWidth="1px" borderColor="nuit/5">
        {["#FF6159", "#FFBD2E", "#28C941"].map((c) => (
          <Box key={c} w="2.5" h="2.5" borderRadius="full" bg={c} />
        ))}
        <Box flex="1" mx="3" h="6" borderRadius="full" bg="white" borderWidth="1px" borderColor="nuit/5" />
        <Text fontSize="xs" fontWeight="600" color="emeraude.700" bg="menthe/40" px="2.5" py="0.5" borderRadius="full">
          Exemple
        </Text>
      </HStack>

      <Flex direction={{ base: "column", sm: "row" }} gap="4" p={{ base: "4", md: "6" }}>
        {/* Carte du grade */}
        <Stack flex="1" gap="4" bg="nuit" color="white" borderRadius="18px" p="5" position="relative" overflow="hidden">
          <Box position="absolute" right="-8" top="-8" w="32" h="32" borderRadius="full" bg="menthe/15" />
          <Text fontSize="sm" color="whiteAlpha.700">
            Bonjour Aïcha 👋
          </Text>
          <HStack gap="3">
            <Box bg="white" borderRadius="full" p="1">
              <PastilleGrade grade="B" />
            </Box>
            <Box>
              <Text fontWeight="700" fontSize="lg" lineHeight="1.2">
                Grade B
              </Text>
              <Text fontSize="sm" color="whiteAlpha.800">
                {LIBELLES_GRADES.B.libelle}
              </Text>
            </Box>
          </HStack>
          <Box>
            <HStack justify="space-between" fontSize="xs" color="whiteAlpha.800" mb="1.5">
              <Text>Dossier complété</Text>
              <Text fontWeight="700" color="menthe">
                100 %
              </Text>
            </HStack>
            <Box h="2" borderRadius="full" bg="whiteAlpha.200" overflow="hidden">
              <Box className="bdt-jauge" h="full" w="100%" borderRadius="full" bg="menthe" />
            </Box>
          </Box>
          <HStack gap="2" fontSize="xs" bg="whiteAlpha.100" borderRadius="full" px="3" py="1.5" alignSelf="flex-start">
            <LuBadgeCheck /> <Text>Provisoire, en cours de vérification</Text>
          </HStack>
        </Stack>

        {/* Ce qui manque */}
        <Stack flex="1.1" gap="2.5">
          <Text fontWeight="700" color="nuit" fontSize="sm">
            Pourquoi ce grade ?
          </Text>
          {ELEMENTS.map(({ icone: Icone, nom, fait }, i) => (
            <HStack key={nom} className="bdt-ligne-apercu" style={{ ["--bdt-delai" as string]: `${300 + i * 120}ms` }} gap="3" bg={fait ? "fond" : "orange.50"} borderRadius="12px" px="3" py="2.5" fontSize="sm">
              <Box color={fait ? "emeraude.600" : "orange.600"} fontSize="md">
                <Icone />
              </Box>
              <Text flex="1" color="encre">
                {nom}
              </Text>
              {fait ? (
                <HStack gap="1" color="emeraude.700" fontWeight="600" fontSize="xs">
                  <LuCheck /> <Text>Fait</Text>
                </HStack>
              ) : (
                <Text color="orange.700" fontWeight="600" fontSize="xs">
                  Manquant
                </Text>
              )}
            </HStack>
          ))}
          <Stack gap="2" bg="emeraude.600" color="white" borderRadius="12px" px="3" py="3" fontSize="sm" mt="1">
            <HStack gap="2">
              <LuSparkles />
              <Text fontWeight="600">Service conseillé : coaching</Text>
            </HStack>
            <Text alignSelf="flex-start" fontSize="xs" fontWeight="600" bg="white" color="emeraude.700" px="3" py="1" borderRadius="full">
              Je suis intéressé(e)
            </Text>
          </Stack>
        </Stack>
      </Flex>
    </Box>
  );
}
