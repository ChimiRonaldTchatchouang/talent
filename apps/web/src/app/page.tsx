"use client";

import { LIBELLES_GRADES, MARQUE } from "@bdt/shared";
import { Box, Container, Flex, Grid, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  LuBadgeCheck,
  LuBriefcaseBusiness,
  LuCalculator,
  LuCheck,
  LuChefHat,
  LuClipboardList,
  LuCompass,
  LuEyeOff,
  LuFileUp,
  LuHardHat,
  LuHeartHandshake,
  LuHeartPulse,
  LuLanguages,
  LuLaptop,
  LuLock,
  LuMessagesSquare,
  LuPlay,
  LuShieldCheck,
  LuSmartphone,
  LuSparkles,
  LuTruck,
  LuUserPlus,
  LuWrench,
  LuZap,
} from "react-icons/lu";
import { ApercuEspace } from "@/components/accueil/apercu";
import { CarrouselGrades } from "@/components/accueil/carrousel-grades";
import { BoutonPilule, Etiquette, MotEncadre, TitreSection } from "@/components/accueil/elements";
import { Entete } from "@/components/accueil/entete";
import type { EmplacementPhoto } from "@/components/accueil/photos";
import { Photo } from "@/components/accueil/portraits";
import { Questions } from "@/components/accueil/questions";
import { Apparition, Parallaxe } from "@/components/animations";
import { PastilleGrade } from "@/components/badges";
import { Logo } from "@/components/marque";

// Contenu : uniquement des informations de la spécification. Aucun chiffre, avis ou partenaire inventé.

type Icone = ComponentType;

const ETAPES: { icone: Icone; titre: string; texte: string }[] = [
  { icone: LuUserPlus, titre: "Crée ton compte", texte: "Ton e-mail ou ton numéro de téléphone, un mot de passe : c'est parti." },
  { icone: LuClipboardList, titre: "Raconte ton parcours", texte: "Études, langues, expérience, famille : une question à la fois." },
  { icone: LuFileUp, titre: "Dépose tes pièces", texte: "Une simple photo de tes documents, prise avec ton téléphone." },
  { icone: LuBadgeCheck, titre: "Découvre ton grade", texte: "Et les services du cabinet qui t'aident à aller plus loin." },
];

const RAISONS: { icone: Icone; titre: string; texte: string }[] = [
  {
    icone: LuClipboardList,
    titre: "Un seul dossier, une fois pour toutes",
    texte: "Ton parcours, tes diplômes, tes langues et ton expérience réunis au même endroit. Plus besoin de tout recommencer à chaque démarche.",
  },
  {
    icone: LuBadgeCheck,
    titre: "Un grade clair, et expliqué",
    texte: "A, B, C ou D : tu sais exactement où tu en es, pourquoi, et ce qu'il te reste à faire pour progresser.",
  },
  {
    icone: LuSparkles,
    titre: "Un accompagnement sur mesure",
    texte: "Pour chaque élément qui te manque, le cabinet te propose le service qui le comble. Tu avances, ton grade suit.",
  },
];

const SERVICES: { emplacement: EmplacementPhoto; icone: Icone; titre: string; texte: string; apport: string }[] = [
  {
    emplacement: "coaching",
    icone: LuHeartHandshake,
    titre: "Coaching",
    texte: "Un accompagnement personnalisé pour construire ton projet et gagner en assurance.",
    apport: "Comble : le coaching",
  },
  {
    emplacement: "entretien",
    icone: LuMessagesSquare,
    titre: "Préparation aux entretiens",
    texte: "Des mises en situation et des conseils concrets pour convaincre un employeur étranger.",
    apport: "Pour convaincre en entretien",
  },
  {
    emplacement: "langues",
    icone: LuLanguages,
    titre: "Formation aux tests de langue",
    texte: "Une préparation ciblée pour atteindre le score demandé : TCF, TEF, IELTS, TOEFL…",
    apport: "Comble : le test de langue",
  },
  {
    emplacement: "miseANiveau",
    icone: LuWrench,
    titre: "Séances de mise à niveau",
    texte: "Bureautique, outils numériques ou ton domaine de métier : on renforce ce qui doit l'être.",
    apport: "Comble : le niveau dans ton métier",
  },
];

/** Domaines de départ (modifiables par le cabinet), avec quelques compétences. */
const METIERS: { icone: Icone; nom: string; competences: string[] }[] = [
  { icone: LuHardHat, nom: "BTP", competences: ["Maçonnerie", "Coffrage", "Conduite d'engins"] },
  { icone: LuHeartPulse, nom: "Santé", competences: ["Soins infirmiers", "Aide-soignant", "Premiers secours"] },
  { icone: LuZap, nom: "Électricité", competences: ["Bâtiment", "Industrie", "Énergie solaire"] },
  { icone: LuLaptop, nom: "Numérique", competences: ["Développement web", "Réseaux", "Support"] },
  { icone: LuTruck, nom: "Logistique", competences: ["Poids lourd", "Cariste", "Gestion de stock"] },
  { icone: LuChefHat, nom: "Hôtellerie", competences: ["Cuisine", "Service en salle", "Réception"] },
  { icone: LuCalculator, nom: "Comptabilité", competences: ["Comptabilité générale", "Paie", "Fiscalité"] },
];

const PUCES_BANDEAU = ["BTP", "Santé", "Électricité", "Numérique", "Logistique", "Hôtellerie", "Comptabilité"];

export default function Accueil() {
  return (
    <Box bg="fond" overflowX="clip">
      {/* ================= Bandeau principal ================= */}
      <Box position="relative" bgGradient="to-b" gradientFrom="#EAFBF0" gradientVia="fond" gradientTo="fond">
        {/* Halos décoratifs */}
        <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px" borderRadius="full" bg="menthe/30" filter="blur(90px)" pointerEvents="none" />
        <Box position="absolute" top="240px" left="-160px" w="380px" h="380px" borderRadius="full" bg="brume" filter="blur(70px)" pointerEvents="none" />

        <Entete />

        <Container maxW="7xl" position="relative" pt={{ base: "6", md: "10" }} pb={{ base: "16", md: "24" }}>
          <Grid templateColumns={{ base: "1fr", lg: "1.1fr 1fr" }} gap={{ base: "12", lg: "8" }} alignItems="center">
            <Apparition sens="gauche" unique>
              <Stack gap="6">
                <Box>
                  <Etiquette>Pour les talents du Cameroun</Etiquette>
                </Box>
                <Heading as="h1" fontSize={{ base: "38px", sm: "48px", md: "62px" }} lineHeight="1.15" fontWeight="700" color="nuit" letterSpacing="-0.02em">
                  Fais reconnaître ton <MotEncadre>talent</MotEncadre> à l&apos;international
                </Heading>
                <Text fontSize={{ base: "md", md: "lg" }} color="gris" maxW="xl">
                  Dépose ton profil une seule fois, depuis ton téléphone. Tu découvres ton grade, ce qui te manque, et les
                  services du cabinet qui te préparent à être présenté aux recruteurs.
                </Text>
                <Flex gap="3" wrap="wrap">
                  <BoutonPilule href="/inscription">Créer mon profil</BoutonPilule>
                  <BoutonPilule href="#etapes" variante="clair" icone={<LuPlay />}>
                    Voir comment ça marche
                  </BoutonPilule>
                </Flex>
                <HStack gap={{ base: "4", md: "6" }} color="gris" fontSize="sm" wrap="wrap">
                  {[
                    { icone: LuCheck, texte: "Inscription gratuite" },
                    { icone: LuSmartphone, texte: "Pensé pour ton téléphone" },
                    { icone: LuLock, texte: "Données protégées" },
                  ].map(({ icone: I, texte }) => (
                    <HStack key={texte} gap="2">
                      <Box w="6" h="6" borderRadius="full" bg="menthe/60" color="emeraude.700" display="grid" placeItems="center" fontSize="xs">
                        <I />
                      </Box>
                      <Text fontWeight="500">{texte}</Text>
                    </HStack>
                  ))}
                </HStack>
              </Stack>
            </Apparition>

            {/* Photo en arche, entourée de pastilles flottantes */}
            <Apparition sens="zoom" unique>
              <Box position="relative" maxW="520px" mx="auto" w="full" px={{ base: "4", md: "8" }}>
                <Box position="absolute" inset="8% 4% 0 4%" borderRadius="full" bg="menthe/50" className="bdt-respiration" />
                <Box position="absolute" inset="2% 0 -4% 0" borderRadius="full" borderWidth="2px" borderStyle="dashed" borderColor="emeraude.200" className="bdt-rotation-lente" />
                <Box position="relative" borderRadius="260px 260px 32px 32px" overflow="hidden" h={{ base: "400px", md: "520px" }} boxShadow="0 30px 60px rgba(15, 42, 74, 0.18)">
                  <Parallaxe vitesse={0.06} position="absolute" inset="-30px 0">
                    <Photo emplacement="accueil" prioritaire position="absolute" inset="0" borderRadius="0" />
                  </Parallaxe>
                </Box>

                <HStack className="bdt-flottant" position="absolute" left={{ base: "0", md: "-6" }} bottom="14%" bg="white" borderRadius="20px" p="3" pr="5" gap="3" boxShadow="0 16px 40px rgba(15, 42, 74, 0.16)">
                  <PastilleGrade grade="A" />
                  <Box>
                    <Text fontWeight="700" color="nuit" lineHeight="1.2">
                      Grade A
                    </Text>
                    <Text fontSize="sm" color="gris">
                      {LIBELLES_GRADES.A.libelle}
                    </Text>
                  </Box>
                </HStack>
                <HStack className="bdt-flottant bdt-flottant-lent" position="absolute" right={{ base: "0", md: "-4" }} top="16%" bg="emeraude.600" color="white" borderRadius="full" px="4" py="2" gap="2" fontWeight="600" fontSize="sm" boxShadow="0 12px 30px rgba(0, 109, 51, 0.35)">
                  <LuShieldCheck /> Diplôme vérifié
                </HStack>
                <Flex position="absolute" left="0" right="0" bottom="-5" justify="center" gap="2" wrap="wrap" px="2">
                  {PUCES_BANDEAU.slice(0, 4).map((nom, i) => (
                    <Text key={nom} className="bdt-puce" style={{ ["--bdt-delai" as string]: `${600 + i * 120}ms` }} bg="white" color="nuit" fontSize="xs" fontWeight="600" px="3" py="1.5" borderRadius="full" boxShadow="0 6px 16px rgba(15, 42, 74, 0.10)">
                      {nom}
                    </Text>
                  ))}
                </Flex>
              </Box>
            </Apparition>
          </Grid>
        </Container>
      </Box>

      {/* ================= Les étapes (bande sombre) ================= */}
      <Box bg="nuit" color="white" py={{ base: "16", md: "24" }} id="etapes" position="relative" overflow="hidden">
        <Box position="absolute" right="-140px" bottom="-160px" w="420px" h="420px" borderRadius="full" bg="emeraude.600/30" filter="blur(80px)" />
        <Container maxW="7xl" position="relative">
          <Grid templateColumns={{ base: "1fr", lg: "1.4fr 1fr" }} gap={{ base: "12", lg: "16" }} alignItems="center">
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap="5" order={{ base: 2, lg: 1 }}>
              {ETAPES.map(({ icone: I, titre, texte }, i) => (
                <Apparition key={titre} sens="zoom" delai={i * 120} h="full">
                  <Stack
                    className="bdt-carte-inclinee"
                    style={{ ["--bdt-angle" as string]: `${[-3, 2.5, 2, -2.5][i]}deg` }}
                    h="full"
                    bg="white"
                    color="encre"
                    borderRadius="24px"
                    p="6"
                    gap="3"
                    position="relative"
                  >
                    <HStack justify="space-between">
                      <Box w="12" h="12" borderRadius="16px" bg="menthe/50" color="emeraude.700" display="grid" placeItems="center" fontSize="xl">
                        <I />
                      </Box>
                      <Text fontSize="3xl" fontWeight="700" color="nuit/10" lineHeight="1">
                        0{i + 1}
                      </Text>
                    </HStack>
                    <Heading as="h3" fontSize="lg" fontWeight="700" color="nuit">
                      {titre}
                    </Heading>
                    <Text fontSize="sm" color="gris">
                      {texte}
                    </Text>
                  </Stack>
                </Apparition>
              ))}
            </SimpleGrid>
            <Stack gap="6" order={{ base: 1, lg: 2 }}>
              <TitreSection
                sombre
                etiquette="Comment ça marche"
                titre={
                  <>
                    4 étapes pour <MotEncadre sombre>révéler</MotEncadre> ton profil
                  </>
                }
                texte="Pas besoin d'ordinateur ni de longues heures. Tout est enregistré au fur et à mesure : tu t'arrêtes quand tu veux, et tu reprends là où tu en étais, même depuis un autre téléphone."
              />
              <Box>
                <BoutonPilule href="/inscription" variante="menthe">
                  Je commence maintenant
                </BoutonPilule>
              </Box>
            </Stack>
          </Grid>
        </Container>
      </Box>

      {/* ================= Pourquoi nous ================= */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }} id="pourquoi">
        <Flex justify="space-between" align={{ base: "flex-start", md: "flex-end" }} direction={{ base: "column", md: "row" }} gap="6" mb="10">
          <TitreSection
            titre={
              <>
                <MotEncadre>3 bonnes raisons</MotEncadre> de nous confier ton profil
              </>
            }
          />
          <BoutonPilule href="/inscription" taille="petite">
            Je me lance
          </BoutonPilule>
        </Flex>
        <Grid templateColumns={{ base: "1fr", lg: "0.9fr 1.3fr" }} gap={{ base: "8", lg: "10" }} alignItems="center" bg="white" borderRadius="32px" p={{ base: "4", md: "8" }} boxShadow="carte">
          <Stack gap="2">
            {RAISONS.map(({ icone: I, titre, texte }, i) => (
              <Apparition key={titre} sens="gauche" delai={i * 120}>
                <HStack className="bdt-raison" gap="4" align="flex-start" p="5" borderRadius="20px">
                  <Box className="bdt-raison-icone" w="12" h="12" borderRadius="16px" bg="brume" color="nuit" display="grid" placeItems="center" fontSize="xl" flexShrink={0}>
                    <I />
                  </Box>
                  <Box>
                    <Heading as="h3" fontSize="lg" fontWeight="700" color="nuit" mb="1">
                      {titre}
                    </Heading>
                    <Text fontSize="sm" color="gris">
                      {texte}
                    </Text>
                  </Box>
                </HStack>
              </Apparition>
            ))}
          </Stack>
          <Apparition sens="droite">
            <Box bg="brume" borderRadius="28px" p={{ base: "3", md: "6" }}>
              <ApercuEspace />
            </Box>
          </Apparition>
        </Grid>
      </Container>

      {/* ================= Les grades (carrousel) ================= */}
      <Box py={{ base: "16", md: "24" }} bg="white" id="grades">
        <Container maxW="7xl" mb="8">
          <TitreSection
            centre
            etiquette="Ton grade"
            titre={
              <>
                Ton grade, <MotEncadre>expliqué</MotEncadre> sans détour
              </>
            }
            texte="Il est calculé à partir de quatre éléments : ton diplôme, ton test de langue, le coaching et ton niveau dans ton métier. D'abord provisoire, il est confirmé par le cabinet après vérification de tes pièces."
          />
        </Container>
        <CarrouselGrades />
      </Box>

      {/* ================= Services ================= */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }} id="services">
        <Box mb="12">
          <TitreSection
            centre
            etiquette="L'accompagnement du cabinet"
            titre={
              <>
                Des services <MotEncadre>concrets</MotEncadre> pour combler ce qui te manque
              </>
            }
            texte="Un élément manque à ton dossier ? Le service qui le comble t'est proposé automatiquement. Un clic sur « Je suis intéressé(e) » et le cabinet te recontacte."
          />
        </Box>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="5">
          {SERVICES.map(({ emplacement, icone: I, titre, texte, apport }, i) => (
            <Apparition key={titre} delai={i * 120} h="full">
              <Stack className="bdt-carte-service group" h="full" bg="white" borderRadius="24px" overflow="hidden" boxShadow="carte" borderWidth="1px" borderColor="nuit/5" gap="0">
                <Box position="relative" h="190px" overflow="hidden">
                  <Box className="bdt-zoom-image" position="absolute" inset="0">
                    <Photo emplacement={emplacement} position="absolute" inset="0" borderRadius="0" />
                  </Box>
                  <Box position="absolute" top="3" left="3" w="10" h="10" borderRadius="full" bg="white" color="emeraude.700" display="grid" placeItems="center" boxShadow="md">
                    <I />
                  </Box>
                </Box>
                <Stack p="5" gap="2" flex="1">
                  <Heading as="h3" fontSize="lg" fontWeight="700" color="nuit">
                    {titre}
                  </Heading>
                  <Text fontSize="sm" color="gris" flex="1">
                    {texte}
                  </Text>
                  <HStack gap="2" pt="3" mt="1" borderTopWidth="1px" borderColor="nuit/5" fontSize="xs" fontWeight="600" color="emeraude.700">
                    <LuCheck />
                    <Text>{apport}</Text>
                  </HStack>
                </Stack>
              </Stack>
            </Apparition>
          ))}
        </SimpleGrid>
        <Flex justify="center" mt="10">
          <BoutonPilule href="/inscription">Découvrir mes services</BoutonPilule>
        </Flex>
      </Container>

      {/* ================= Métiers ================= */}
      <Box bg="white" py={{ base: "16", md: "24" }}>
        <Container maxW="7xl">
          <Box mb="12">
            <TitreSection
              centre
              etiquette="Les domaines"
              titre={
                <>
                  Ton <MotEncadre>métier</MotEncadre> a sa place ici
                </>
              }
              texte="Du chantier à l'hôpital, de la cuisine à l'informatique : choisis ton domaine et mets en avant tes compétences. Si la tienne n'est pas dans la liste, tu peux la proposer."
            />
          </Box>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
            {METIERS.map(({ icone: I, nom, competences }, i) => (
              <Apparition key={nom} sens="zoom" delai={(i % 4) * 90} h="full">
                <Stack className="bdt-carte-metier" h="full" bg="fond" borderRadius="22px" p="5" gap="3" borderWidth="1px" borderColor="nuit/5">
                  <HStack gap="3">
                    <Box className="bdt-carte-metier-icone" w="11" h="11" borderRadius="14px" bg="white" color="emeraude.700" display="grid" placeItems="center" fontSize="lg" boxShadow="carte">
                      <I />
                    </Box>
                    <Heading as="h3" fontSize="lg" fontWeight="700" color="nuit">
                      {nom}
                    </Heading>
                  </HStack>
                  <Flex gap="1.5" wrap="wrap">
                    {competences.map((c) => (
                      <Text key={c} fontSize="xs" bg="white" color="gris" px="2.5" py="1" borderRadius="full" borderWidth="1px" borderColor="nuit/5">
                        {c}
                      </Text>
                    ))}
                  </Flex>
                </Stack>
              </Apparition>
            ))}
            <Apparition sens="zoom" delai={270} h="full">
              <Link href="/inscription" style={{ height: "100%", display: "block" }}>
                <Stack className="bdt-cliquable" h="full" bg="emeraude.600" color="white" borderRadius="22px" p="5" gap="2" justify="center">
                  <LuBriefcaseBusiness size={26} />
                  <Text fontWeight="700" fontSize="lg">
                    Et ton métier ?
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.900">
                    Crée ton profil et dis-nous ce que tu sais faire →
                  </Text>
                </Stack>
              </Link>
            </Apparition>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ================= Recruteurs et confidentialité ================= */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="5">
          <Apparition sens="gauche" h="full">
            <Stack className="bdt-cliquable" h="full" bg="nuit" color="white" borderRadius="28px" p={{ base: "7", md: "10" }} gap="4" position="relative" overflow="hidden">
              <Box position="absolute" right="-12" top="-12" w="48" h="48" borderRadius="full" bg="menthe/10" />
              <Box w="12" h="12" borderRadius="16px" bg="menthe" color="nuit" display="grid" placeItems="center" fontSize="xl">
                <LuCompass />
              </Box>
              <Heading as="h3" fontSize={{ base: "xl", md: "2xl" }} fontWeight="700">
                Et côté recruteurs ?
              </Heading>
              <Text color="whiteAlpha.800">
                Les recruteurs accèdent à la plateforme uniquement sur invitation du cabinet, pour une durée limitée. Ils consultent des
                profils anonymisés et font leur sélection. C&apos;est ensuite le cabinet qui organise la mise en relation.
              </Text>
            </Stack>
          </Apparition>
          <Apparition sens="droite" h="full">
            <Stack className="bdt-cliquable" h="full" bg="menthe" color="nuit" borderRadius="28px" p={{ base: "7", md: "10" }} gap="4" position="relative" overflow="hidden">
              <Box position="absolute" right="-12" bottom="-12" w="48" h="48" borderRadius="full" bg="whiteAlpha.500" />
              <Box w="12" h="12" borderRadius="16px" bg="nuit" color="menthe" display="grid" placeItems="center" fontSize="xl">
                <LuEyeOff />
              </Box>
              <Heading as="h3" fontSize={{ base: "xl", md: "2xl" }} fontWeight="700">
                Tes coordonnées restent privées
              </Heading>
              <Text>
                Ton téléphone, ton e-mail, ton adresse et tes documents ne sont jamais montrés aux recruteurs. Tu décides si ton profil
                peut leur être présenté, et tu peux changer d&apos;avis à tout moment.
              </Text>
            </Stack>
          </Apparition>
        </SimpleGrid>
      </Container>

      {/* ================= Questions ================= */}
      <Container maxW="4xl" pb={{ base: "16", md: "24" }} id="questions">
        <Box mb="10">
          <TitreSection
            centre
            etiquette="Questions fréquentes"
            titre={
              <>
                Tu te poses des <MotEncadre>questions</MotEncadre> ?
              </>
            }
          />
        </Box>
        <Apparition>
          <Questions />
        </Apparition>
      </Container>

      {/* ================= Appel final + bandeau défilant ================= */}
      <Container maxW="7xl" pb={{ base: "16", md: "24" }}>
        <Apparition sens="zoom">
          <Box borderRadius="36px" overflow="hidden" bg="white" boxShadow="0 30px 70px rgba(15, 42, 74, 0.12)" borderWidth="1px" borderColor="nuit/5">
            <Grid templateColumns={{ base: "1fr", md: "1.2fr 1fr" }} position="relative">
              <Box position="absolute" left="-20" top="-20" w="64" h="64" borderRadius="full" bg="menthe/30" filter="blur(40px)" />
              <Stack gap="5" p={{ base: "8", md: "14" }} justify="center" position="relative">
                <Logo />
                <Heading as="h2" fontSize={{ base: "30px", md: "44px" }} lineHeight="1.25" fontWeight="700" color="nuit">
                  Pourquoi attendre ? Dépose <MotEncadre>ton profil</MotEncadre> aujourd&apos;hui
                </Heading>
                <Text color="gris">
                  Quelques minutes suffisent pour commencer. Tu pourras compléter ton dossier à ton rythme.
                </Text>
                <Box>
                  <BoutonPilule href="/inscription">Créer mon profil gratuitement</BoutonPilule>
                </Box>
              </Stack>
              <Box position="relative" minH={{ base: "280px", md: "420px" }} overflow="hidden">
                <Box className="bdt-zoom-image" position="absolute" inset="0">
                  <Photo emplacement="appel" position="absolute" inset="0" borderRadius="0" />
                </Box>
              </Box>
            </Grid>
            <Box bg="emeraude.600" color="white" py="4" overflow="hidden" aria-hidden>
              <Box className="bdt-defilement" display="flex" w="max-content">
                {[0, 1].map((copie) => (
                  <HStack key={copie} gap="0" flexShrink={0}>
                    {[...PUCES_BANDEAU, ...PUCES_BANDEAU].map((nom, i) => (
                      <HStack key={`${nom}-${i}`} gap="6" px="6" fontWeight="600" whiteSpace="nowrap">
                        <Text>{nom}</Text>
                        <Box color="menthe">
                          <LuSparkles />
                        </Box>
                      </HStack>
                    ))}
                  </HStack>
                ))}
              </Box>
            </Box>
          </Box>
        </Apparition>
      </Container>

      {/* ================= Pied de page ================= */}
      <Box as="footer" bg="nuit" color="whiteAlpha.800" pt={{ base: "14", md: "16" }} pb="8">
        <Container maxW="7xl">
          <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr 1fr 1.2fr" }} gap="10">
            <Stack gap="4" maxW="sm">
              <Logo clair />
              <Text fontSize="sm">{MARQUE.accroche} Une plateforme pour préparer les talents camerounais aux opportunités à l&apos;international.</Text>
            </Stack>
            <Stack gap="3" fontSize="sm">
              <Text fontWeight="700" color="white">
                La plateforme
              </Text>
              <a className="bdt-lien-pied" href="#etapes">Comment ça marche</a>
              <a className="bdt-lien-pied" href="#grades">Les grades</a>
              <a className="bdt-lien-pied" href="#services">Les services</a>
              <a className="bdt-lien-pied" href="#questions">Questions fréquentes</a>
            </Stack>
            <Stack gap="3" fontSize="sm">
              <Text fontWeight="700" color="white">
                Mon espace
              </Text>
              <Link className="bdt-lien-pied" href="/inscription">Créer mon profil</Link>
              <Link className="bdt-lien-pied" href="/connexion">Se connecter</Link>
              <Text>Recruteurs : accès sur invitation du cabinet</Text>
            </Stack>
            <Stack gap="3" fontSize="sm">
              <Text fontWeight="700" color="white">
                Tes données
              </Text>
              <Text>
                Protégées conformément à la loi camerounaise n° 2024/017. Tu peux demander leur suppression à tout moment.
              </Text>
            </Stack>
          </Grid>
          <Flex mt="12" pt="6" borderTopWidth="1px" borderColor="whiteAlpha.200" justify="space-between" gap="4" direction={{ base: "column", md: "row" }} fontSize="xs" color="whiteAlpha.600">
            <Text>
              © {new Date().getFullYear()} {MARQUE.nom}
            </Text>
            <Text maxW="2xl" textAlign={{ md: "right" }}>
              {MARQUE.avertissement}
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
