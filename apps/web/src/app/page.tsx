"use client";

import { LIBELLES_GRADES, MARQUE, type Grade } from "@bdt/shared";
import { Box, Button, Container, Flex, Grid, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { LuBadgeCheck, LuClipboardList, LuFileUp, LuGraduationCap, LuLanguages, LuMessagesSquare, LuSparkles, LuUserPlus } from "react-icons/lu";
import { Portrait } from "@/components/accueil/portraits";
import { PastilleGrade } from "@/components/badges";
import { Logo } from "@/components/marque";

const ETAPES = [
  { icone: LuUserPlus, titre: "Crée ton compte", texte: "Avec ton e-mail et un mot de passe. Deux minutes suffisent." },
  { icone: LuClipboardList, titre: "Remplis ton dossier", texte: "Une question à la fois, depuis ton téléphone. Tout est enregistré : tu peux reprendre plus tard." },
  { icone: LuFileUp, titre: "Dépose tes pièces", texte: "Une photo de tes documents suffit : pièce d'identité, diplôme, attestations, CV." },
  { icone: LuBadgeCheck, titre: "Découvre ton grade", texte: "Tu vois ce qui te manque et les services du cabinet qui peuvent t'aider." },
];

const GRADES: { grade: Grade; texte: string }[] = [
  { grade: "A", texte: "Diplôme, test de langue, coaching et niveau dans ton domaine : tout est réuni." },
  { grade: "B", texte: "Il ne te manque que le coaching." },
  { grade: "C", texte: "Tu as un diplôme ; il te manque le test de langue ou une mise à niveau." },
  { grade: "D", texte: "Tu n'as pas de diplôme, mais ton expérience compte." },
];

const SERVICES = [
  { icone: LuSparkles, titre: "Coaching", texte: "Un accompagnement pour préparer ton projet de départ." },
  { icone: LuMessagesSquare, titre: "Préparation aux entretiens", texte: "Pour réussir tes entretiens avec les employeurs étrangers." },
  { icone: LuLanguages, titre: "Formation aux tests de langue", texte: "Pour atteindre le score demandé." },
  { icone: LuGraduationCap, titre: "Séances de mise à niveau", texte: "Bureautique, outils numériques ou ton domaine de métier." },
];

function BoutonInscription({ clair = false }: { clair?: boolean }) {
  return (
    <Button
      asChild
      size="lg"
      bg={clair ? "menthe" : "emeraude.600"}
      color={clair ? "nuit" : "white"}
      _hover={{ bg: clair ? "#64e38f" : "emeraude.700" }}
      borderRadius="full"
      px="8"
    >
      <Link href="/inscription">Créer mon profil</Link>
    </Button>
  );
}

export default function Accueil() {
  return (
    <Box bg="fond">
      {/* Bandeau principal */}
      <Box bg="nuit" color="white" borderBottomRadius={{ base: "28px", md: "48px" }} overflow="hidden">
        <Container maxW="6xl" py="5">
          <Flex justify="space-between" align="center" gap="3">
            <Logo clair />
            <HStack gap="2">
              <Button asChild variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} size="sm">
                <Link href="/connexion">Se connecter</Link>
              </Button>
              <Button asChild size="sm" bg="menthe" color="nuit" borderRadius="full" display={{ base: "none", sm: "inline-flex" }}>
                <Link href="/inscription">Créer mon profil</Link>
              </Button>
            </HStack>
          </Flex>
        </Container>
        <Container maxW="6xl" pt={{ base: "8", md: "16" }} pb={{ base: "12", md: "20" }}>
          <Grid templateColumns={{ base: "1fr", md: "1.1fr 1fr" }} gap={{ base: "10", md: "12" }} alignItems="center">
            <Stack gap="6">
              <Heading as="h1" fontSize={{ base: "34px", md: "56px" }} lineHeight="1.1" fontWeight="700">
                Ton talent,{" "}
                <Text as="span" color="menthe">
                  prêt pour l&apos;international.
                </Text>
              </Heading>
              <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.800" maxW="lg">
                Dépose ton profil une seule fois. Nous te disons où tu en es, ce qui te manque, et comment le cabinet
                peut t&apos;aider à te préparer pour être présenté aux recruteurs.
              </Text>
              <Stack direction={{ base: "column", sm: "row" }} gap="3">
                <BoutonInscription clair />
                <Button asChild size="lg" variant="outline" color="white" borderColor="whiteAlpha.500" borderRadius="full" _hover={{ bg: "whiteAlpha.100" }}>
                  <Link href="/connexion">J&apos;ai déjà un compte</Link>
                </Button>
              </Stack>
              <Text fontSize="sm" color="whiteAlpha.700">
                Gratuit · Sur ton téléphone · Tu peux t&apos;arrêter et reprendre quand tu veux
              </Text>
            </Stack>
            <Grid templateColumns="1fr 1fr" gap="4" maxW="460px" w="full" justifySelf={{ md: "end" }}>
              <Portrait index={0} h={{ base: "190px", md: "250px" }} mt="10" />
              <Portrait index={1} h={{ base: "190px", md: "250px" }} />
              <Portrait index={2} h={{ base: "190px", md: "250px" }} mt="-6" />
              <Portrait index={3} h={{ base: "190px", md: "250px" }} mt="4" />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Comment ça marche */}
      <Container maxW="6xl" py={{ base: "14", md: "20" }}>
        <Stack gap="2" mb="10" maxW="2xl">
          <Text color="emeraude.600" fontWeight="600">Comment ça marche</Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "4xl" }} color="nuit">
            Quatre étapes, à ton rythme
          </Heading>
        </Stack>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
          {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
            <Box key={titre} bg={i === 1 ? "menthe" : i === 3 ? "nuit" : "white"} color={i === 3 ? "white" : "encre"} borderRadius="24px" p="6" boxShadow="carte">
              <Box fontSize="28px" mb="4" color={i === 3 ? "menthe" : "emeraude.600"}>
                <Icone />
              </Box>
              <Text fontWeight="700" fontSize="lg" mb="2">
                {i + 1}. {titre}
              </Text>
              <Text color={i === 3 ? "whiteAlpha.800" : "gris"}>{texte}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>

      {/* Les grades */}
      <Box bg="white" py={{ base: "14", md: "20" }}>
        <Container maxW="6xl">
          <Grid templateColumns={{ base: "1fr", md: "1fr 1.2fr" }} gap="10" alignItems="center">
            <Stack gap="4">
              <Text color="emeraude.600" fontWeight="600">Ton grade</Text>
              <Heading as="h2" fontSize={{ base: "2xl", md: "4xl" }} color="nuit">
                Tu sais où tu en es, et ce qu&apos;il te reste à faire
              </Heading>
              <Text color="gris">
                Ton grade est calculé à partir de quatre éléments : ton diplôme, ton test de langue, le coaching et ton
                niveau dans ton domaine. Il est d&apos;abord provisoire, puis confirmé par le cabinet après vérification de
                tes pièces.
              </Text>
              <Box>
                <BoutonInscription />
              </Box>
            </Stack>
            <Stack gap="3">
              {GRADES.map(({ grade, texte }) => (
                <HStack key={grade} gap="4" bg="fond" borderRadius="20px" p="4" align="flex-start">
                  <PastilleGrade grade={grade} />
                  <Box>
                    <Text fontWeight="700" color="nuit">
                      Grade {grade} · {LIBELLES_GRADES[grade].libelle}
                    </Text>
                    <Text color="gris" fontSize="sm">
                      {texte}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Stack>
          </Grid>
        </Container>
      </Box>

      {/* Services */}
      <Container maxW="6xl" py={{ base: "14", md: "20" }}>
        <Stack gap="2" mb="10" maxW="2xl">
          <Text color="emeraude.600" fontWeight="600">L&apos;accompagnement du cabinet</Text>
          <Heading as="h2" fontSize={{ base: "2xl", md: "4xl" }} color="nuit">
            Des services pour combler ce qui te manque
          </Heading>
        </Stack>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
          {SERVICES.map(({ icone: Icone, titre, texte }) => (
            <Stack key={titre} bg="white" borderRadius="24px" p="6" boxShadow="carte" gap="3">
              <Box w="12" h="12" borderRadius="full" bg="brume" display="grid" placeItems="center" color="nuit" fontSize="22px">
                <Icone />
              </Box>
              <Text fontWeight="700" color="nuit">
                {titre}
              </Text>
              <Text color="gris">{texte}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Container>

      {/* Appel final */}
      <Container maxW="6xl" pb={{ base: "14", md: "20" }}>
        <Grid
          templateColumns={{ base: "1fr", md: "1fr auto" }}
          gap="6"
          alignItems="center"
          bg="emeraude.600"
          color="white"
          borderRadius="32px"
          p={{ base: "8", md: "12" }}
        >
          <Stack gap="2">
            <Heading as="h2" fontSize={{ base: "2xl", md: "3xl" }}>
              Prêt à déposer ton profil ?
            </Heading>
            <Text color="whiteAlpha.900">{MARQUE.avertissement}</Text>
          </Stack>
          <BoutonInscription clair />
        </Grid>
      </Container>

      <Box as="footer" bg="nuit" color="whiteAlpha.800" py="8">
        <Container maxW="6xl">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap="4">
            <Logo clair />
            <Stack gap="1" fontSize="sm">
              <Text>Recruteurs : l&apos;accès se fait sur invitation du cabinet.</Text>
              <Text>Tes données sont protégées (loi camerounaise n° 2024/017). Tu peux demander leur suppression à tout moment.</Text>
            </Stack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
