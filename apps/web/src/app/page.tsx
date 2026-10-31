"use client";

import { LIBELLES_GRADES, MARQUE, type Grade } from "@bdt/shared";
import { Box, Container, Flex, Grid, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBadgeCheck,
  LuCheck,
  LuClipboardList,
  LuFileUp,
  LuGraduationCap,
  LuLanguages,
  LuLock,
  LuMessagesSquare,
  LuSmartphone,
  LuSparkles,
  LuUserPlus,
} from "react-icons/lu";
import { Photo } from "@/components/accueil/portraits";
import { Apparition, Parallaxe } from "@/components/animations";
import { PastilleGrade } from "@/components/badges";
import { Logo } from "@/components/marque";

// ---------- Petits éléments de style (inspirés des maquettes : pilules, étiquettes, cartes arrondies) ----------

/** Bouton « pilule » avec une flèche dans un rond, comme sur les maquettes. */
function BoutonPilule({ href, children, variante = "menthe" }: { href: string; children: ReactNode; variante?: "menthe" | "nuit" | "contour" }) {
  const styles = {
    menthe: { bg: "menthe", color: "nuit", rond: "nuit", fleche: "menthe" },
    nuit: { bg: "nuit", color: "white", rond: "menthe", fleche: "nuit" },
    contour: { bg: "transparent", color: "white", rond: "white", fleche: "nuit" },
  }[variante];
  return (
    <Link href={href}>
      <HStack
        display="inline-flex"
        gap="3"
        bg={styles.bg}
        color={styles.color}
        borderRadius="full"
        pl="6"
        pr="1.5"
        h="52px"
        fontWeight="600"
        borderWidth={variante === "contour" ? "1px" : 0}
        borderColor="whiteAlpha.500"
        className="group"
        transition="transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease"
        _hover={{ transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(0, 0, 0, 0.18)" }}
        _active={{ transform: "translateY(0) scale(0.97)", boxShadow: "none" }}
      >
        <Text>{children}</Text>
        <Box
          w="10"
          h="10"
          borderRadius="full"
          bg={styles.rond}
          color={styles.fleche}
          display="grid"
          placeItems="center"
          transition="transform 0.25s ease"
          _groupHover={{ transform: "translateX(3px) rotate(-45deg)" }}
        >
          <LuArrowRight />
        </Box>
      </HStack>
    </Link>
  );
}

/** Petite étiquette de section (« ✱ Comment ça marche »). */
function Etiquette({ children, sombre = false }: { children: ReactNode; sombre?: boolean }) {
  return (
    <HStack
      display="inline-flex"
      gap="2"
      bg={sombre ? "whiteAlpha.100" : "white"}
      color={sombre ? "menthe" : "nuit"}
      borderRadius="full"
      px="3"
      py="1"
      fontSize="sm"
      fontWeight="600"
      boxShadow={sombre ? "none" : "carte"}
    >
      <Text as="span" aria-hidden>
        ✱
      </Text>
      {children}
    </HStack>
  );
}

function TitreSection({ etiquette, titre, texte, centre = false }: { etiquette: string; titre: ReactNode; texte?: string; centre?: boolean }) {
  return (
    <Apparition>
    <Stack gap="4" maxW="2xl" mx={centre ? "auto" : undefined} textAlign={centre ? "center" : undefined} align={centre ? "center" : "flex-start"}>
      <Etiquette>{etiquette}</Etiquette>
      <Heading as="h2" fontSize={{ base: "28px", md: "42px" }} lineHeight="1.15" color="nuit" fontWeight="700">
        {titre}
      </Heading>
      {texte && <Text color="gris" fontSize={{ base: "md", md: "lg" }}>{texte}</Text>}
    </Stack>
    </Apparition>
  );
}

// ---------- Contenu (uniquement des informations de la spécification : aucun chiffre ni témoignage inventé) ----------

const APPROCHE = [
  { icone: LuClipboardList, titre: "Un seul dossier", texte: "Tu déposes ton profil une fois, depuis ton téléphone. Tout est enregistré à chaque étape.", fond: "white", couleur: "encre" },
  { icone: LuBadgeCheck, titre: "Un grade clair", texte: "A, B, C ou D : tu sais où tu en es, et ce qui te manque pour avancer.", fond: "menthe", couleur: "nuit" },
  { icone: LuSparkles, titre: "Un accompagnement", texte: "Le cabinet te propose les services qui comblent tes manques : coaching, langues, mise à niveau.", fond: "nuit", couleur: "white" },
] as const;

const ETAPES = [
  { icone: LuUserPlus, titre: "Crée ton compte", texte: "Avec ton e-mail (ou ton téléphone) et un mot de passe." },
  { icone: LuClipboardList, titre: "Remplis ton dossier", texte: "Une question à la fois. Tu peux t'arrêter et reprendre." },
  { icone: LuFileUp, titre: "Dépose tes pièces", texte: "Une photo de tes documents suffit." },
  { icone: LuBadgeCheck, titre: "Découvre ton grade", texte: "Et les services qui peuvent t'aider." },
];

const SERVICES = [
  { emplacement: "echange", icone: LuSparkles, titre: "Coaching", texte: "Un accompagnement personnalisé pour préparer ton projet de départ et ta vie professionnelle.", etiquette: "Coaching" },
  { emplacement: "entretien", icone: LuMessagesSquare, titre: "Préparation aux entretiens", texte: "Des simulations et des conseils pour réussir tes entretiens avec les employeurs étrangers.", etiquette: "Entretiens" },
  { emplacement: "formation", icone: LuLanguages, titre: "Tests de langue", texte: "Une formation pour atteindre le score demandé aux tests (TCF, TEF, IELTS, TOEFL…).", etiquette: "Langues" },
] as const;

const GRADES: { grade: Grade; texte: string }[] = [
  { grade: "A", texte: "Diplôme, test de langue, coaching et niveau dans ton domaine : tout est réuni." },
  { grade: "B", texte: "Il ne te manque que le coaching." },
  { grade: "C", texte: "Tu as un diplôme ; il te manque le test de langue ou une mise à niveau." },
  { grade: "D", texte: "Pas de diplôme, mais ton expérience compte." },
];

export default function Accueil() {
  return (
    <Box bg="fond" overflowX="hidden">
      {/* Bandeau d'information */}
      <Box bg="menthe" color="nuit" fontSize="sm" fontWeight="600">
        <Container maxW="7xl" py="2">
          <Flex justify="space-between" gap="4">
            <HStack gap="2">
              <LuCheck aria-hidden />
              <Text>Inscription gratuite, depuis ton téléphone</Text>
            </HStack>
            <Text display={{ base: "none", md: "block" }}>Recruteurs : accès sur invitation du cabinet</Text>
          </Flex>
        </Container>
      </Box>

      {/* En-tête et grand bandeau */}
      <Box bg="nuit" color="white" position="relative">
        <Container maxW="7xl" py="5" position="relative" zIndex="2">
          <Flex justify="space-between" align="center" gap="4">
            <Logo clair />
            <HStack gap="8" display={{ base: "none", lg: "flex" }} fontWeight="500" color="whiteAlpha.800">
              <a href="#approche">Notre approche</a>
              <a href="#etapes">Comment ça marche</a>
              <a href="#services">Services</a>
              <a href="#grades">Les grades</a>
            </HStack>
            <HStack gap="3">
              <Link href="/connexion">
                <Text fontWeight="600" color="white" display={{ base: "none", sm: "block" }}>
                  Se connecter
                </Text>
              </Link>
              <Box display={{ base: "none", md: "block" }}>
                <BoutonPilule href="/inscription">Créer mon profil</BoutonPilule>
              </Box>
            </HStack>
          </Flex>
        </Container>

        <Container maxW="7xl" pb={{ base: "0", lg: "0" }}>
          <Grid templateColumns={{ base: "1fr", lg: "1.05fr 1fr" }} gap={{ base: "8", lg: "6" }} alignItems="stretch">
            <Apparition sens="gauche" unique>
            <Stack gap="6" py={{ base: "8", lg: "20" }} position="relative" zIndex="2">
              <Box>
                <Etiquette sombre>Pour les travailleurs camerounais</Etiquette>
              </Box>
              <Heading as="h1" fontSize={{ base: "38px", md: "60px" }} lineHeight="1.05" fontWeight="700" textTransform="uppercase" letterSpacing="-0.01em">
                Ton talent,{" "}
                <Text as="span" color="menthe">
                  prêt
                </Text>{" "}
                pour l&apos;international
              </Heading>
              <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.800" maxW="lg">
                Dépose ton profil une seule fois. Nous te disons où tu en es, ce qui te manque, et comment le cabinet peut
                t&apos;aider à te préparer pour être présenté aux recruteurs.
              </Text>
              <Stack direction={{ base: "column", sm: "row" }} gap="3" align={{ sm: "center" }}>
                <BoutonPilule href="/inscription">Créer mon profil</BoutonPilule>
                <BoutonPilule href="/connexion" variante="contour">
                  J&apos;ai déjà un compte
                </BoutonPilule>
              </Stack>
              <HStack gap="5" color="whiteAlpha.800" fontSize="sm" wrap="wrap">
                <HStack gap="2">
                  <LuSmartphone aria-hidden /> <Text>Pensé pour le téléphone</Text>
                </HStack>
                <HStack gap="2">
                  <LuLock aria-hidden /> <Text>Données protégées</Text>
                </HStack>
              </HStack>
            </Stack>
            </Apparition>

            {/* Photo principale (parallaxe) avec une carte de grade posée dessus */}
            <Box position="relative" minH={{ base: "380px", md: "480px" }} mx={{ base: "-4", lg: "0" }} overflow="hidden" borderRadius={{ base: "0", lg: "32px 32px 0 0" }}>
              <Parallaxe vitesse={0.08} position="absolute" inset="-40px 0">
                <Photo emplacement="accueil" prioritaire position="absolute" inset="0" borderRadius="0" />
              </Parallaxe>
              <Box position="absolute" inset="0" bgGradient="to-t" gradientFrom="nuit/70" gradientTo="transparent" gradientVia="transparent" />
              <HStack className="bdt-flottant" position="absolute" left={{ base: "4", md: "6" }} bottom={{ base: "6", md: "8" }} bg="white" color="encre" borderRadius="20px" p="3" pr="5" gap="3" boxShadow="lg">
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
              <HStack className="bdt-flottant bdt-flottant-lent" position="absolute" right={{ base: "4", md: "6" }} top={{ base: "6", md: "10" }} bg="menthe" color="nuit" borderRadius="full" px="4" py="2" gap="2" fontWeight="600" fontSize="sm" boxShadow="lg">
                <LuCheck aria-hidden /> Diplôme vérifié
              </HStack>
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* Notre approche : trois cartes (blanche, menthe, sombre) */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }} id="approche">
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="6" alignItems="end" mb="10">
          <TitreSection etiquette="Notre approche" titre="Tout ce qu'il faut pour te préparer, au même endroit" />
          <Text color="gris" fontSize="lg" maxW="md" justifySelf={{ md: "end" }}>
            Les candidats n&apos;arrivent pas tous avec le même niveau. La plateforme te classe, t&apos;explique pourquoi, et te
            montre comment progresser.
          </Text>
        </Grid>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="5">
          {APPROCHE.map(({ icone: Icone, titre, texte, fond, couleur }, i) => (
            <Apparition key={titre} delai={i * 120} h="full">
            <Stack className="bdt-cliquable" h="full" bg={fond} color={couleur} borderRadius="28px" p="7" gap="4" boxShadow={fond === "white" ? "carte" : "none"} minH="260px" position="relative" overflow="hidden">
              <Box fontSize="36px" color={fond === "nuit" ? "menthe" : "nuit"}>
                <Icone />
              </Box>
              <Heading as="h3" fontSize="22px" fontWeight="700">
                {titre}
              </Heading>
              <Text color={fond === "nuit" ? "whiteAlpha.800" : fond === "menthe" ? "nuit" : "gris"} flex="1">
                {texte}
              </Text>
              {fond === "menthe" && <Box position="absolute" right="-10" bottom="-10" w="40" h="40" borderRadius="full" bg="whiteAlpha.400" />}
            </Stack>
            </Apparition>
          ))}
        </SimpleGrid>
      </Container>

      {/* Comment ça marche : collage photo + étapes */}
      <Box bg="white" py={{ base: "16", md: "24" }} id="etapes">
        <Container maxW="7xl">
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: "10", lg: "16" }} alignItems="center">
            <Grid templateColumns="1fr 1.4fr" templateRows="auto auto" gap="4">
              <Apparition sens="zoom" gridColumn="1 / span 2">
                <Box overflow="hidden" borderRadius="24px" h={{ base: "220px", md: "300px" }} position="relative">
                  <Parallaxe vitesse={0.1} position="absolute" inset="-30px 0">
                    <Photo emplacement="equipe" position="absolute" inset="0" borderRadius="0" />
                  </Parallaxe>
                </Box>
              </Apparition>
              <Apparition delai={150}>
              <Stack bg="menthe" color="nuit" borderRadius="24px" p="5" justify="center" align="center" textAlign="center" gap="2" h="full">
                <Box w="10" h="10" borderRadius="full" bg="nuit" color="menthe" display="grid" placeItems="center">
                  <LuCheck />
                </Box>
                <Text fontSize="3xl" fontWeight="700" lineHeight="1">
                  4
                </Text>
                <Text fontSize="sm" fontWeight="600">
                  étapes simples
                </Text>
              </Stack>
              </Apparition>
              <Apparition delai={250}>
                <Photo emplacement="groupe" h={{ base: "170px", md: "210px" }} />
              </Apparition>
            </Grid>
            <Stack gap="8">
              <TitreSection etiquette="Comment ça marche" titre="Quatre étapes, à ton rythme" texte="Tu peux quitter à tout moment : au retour, un bouton te ramène là où tu t'étais arrêté." />
              <Stack gap="3">
                {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
                  <Apparition key={titre} sens="droite" delai={i * 100}>
                  <HStack gap="4" bg="fond" borderRadius="20px" p="4" align="flex-start" transition="background-color 0.2s" _hover={{ bg: "brume" }}>
                    <Box w="11" h="11" borderRadius="full" bg="nuit" color="menthe" display="grid" placeItems="center" flexShrink={0} fontSize="lg">
                      <Icone />
                    </Box>
                    <Box>
                      <Text fontWeight="700" color="nuit">
                        {i + 1}. {titre}
                      </Text>
                      <Text color="gris" fontSize="sm">
                        {texte}
                      </Text>
                    </Box>
                  </HStack>
                  </Apparition>
                ))}
              </Stack>
              <Box>
                <BoutonPilule href="/inscription" variante="nuit">
                  Commencer maintenant
                </BoutonPilule>
              </Box>
            </Stack>
          </Grid>
        </Container>
      </Box>

      {/* Services : cartes photo numérotées */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }} id="services">
        <Grid templateColumns={{ base: "1fr", lg: "0.8fr 2fr" }} gap="8" alignItems="stretch">
          <Stack gap="6" justify="space-between">
            <TitreSection etiquette="L'accompagnement" titre="Comment on te fait progresser" texte="Pour chaque élément qui te manque, le cabinet te propose le service qui le comble. Un clic sur « Je suis intéressé » suffit." />
            <Stack gap="2" display={{ base: "none", lg: "flex" }}>
              <HStack gap="2" color="nuit" fontWeight="600">
                <LuGraduationCap /> <Text>Aussi : séances de mise à niveau</Text>
              </HStack>
              <Text color="gris" fontSize="sm">
                Bureautique, outils numériques ou ton domaine de métier.
              </Text>
            </Stack>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
            {SERVICES.map(({ emplacement, titre, texte, etiquette }, i) => (
              <Apparition key={titre} delai={i * 140} h="full">
              <Box className="group bdt-cliquable" position="relative" borderRadius="28px" overflow="hidden" minH={{ base: "380px", md: "460px" }} h="full" color="white">
                <Box position="absolute" inset="0" transition="transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" _groupHover={{ transform: "scale(1.05)" }}>
                  <Photo emplacement={emplacement} position="absolute" inset="0" borderRadius="0" />
                </Box>
                <Box position="absolute" inset="0" bgGradient="to-t" gradientFrom="nuit/95" gradientVia="nuit/50" gradientTo="transparent" />
                <Box position="absolute" top="4" left="4" w="9" h="9" borderRadius="full" bg="white" color="nuit" display="grid" placeItems="center" fontWeight="700">
                  {i + 1}
                </Box>
                <Stack position="absolute" left="0" right="0" bottom="0" p="5" gap="3">
                  <Heading as="h3" fontSize="24px" fontWeight="700" lineHeight="1.15">
                    {titre}
                  </Heading>
                  <Text fontSize="sm" color="whiteAlpha.900">
                    {texte}
                  </Text>
                  <HStack justify="space-between" bg={i === 2 ? "menthe" : "whiteAlpha.300"} color={i === 2 ? "nuit" : "white"} borderRadius="full" px="4" py="2" fontSize="sm" fontWeight="600">
                    <Text>{etiquette}</Text>
                    <LuCheck />
                  </HStack>
                </Stack>
              </Box>
              </Apparition>
            ))}
          </SimpleGrid>
        </Grid>
      </Container>

      {/* Mosaïque : candidats, recruteurs, données */}
      <Box bg="white" py={{ base: "16", md: "24" }}>
        <Container maxW="7xl">
          <Box mb="10">
            <TitreSection etiquette="La plateforme" titre="Un lien entre les talents et les employeurs" />
          </Box>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} templateRows={{ md: "repeat(2, 230px)" }} gap="4">
            <Box gridColumn={{ md: "1 / span 2" }} gridRow={{ md: "1 / span 1" }} h={{ base: "220px", md: "auto" }} position="relative" overflow="hidden" borderRadius="24px">
              <Parallaxe vitesse={0.1} position="absolute" inset="-30px 0">
                <Photo emplacement="metier" position="absolute" inset="0" borderRadius="0" />
              </Parallaxe>
            </Box>
            <Stack bg="menthe" color="nuit" borderRadius="24px" p="6" gap="3" gridColumn={{ md: "3 / span 1" }}>
              <Heading as="h3" fontSize="xl" fontWeight="700">
                Pour toi
              </Heading>
              <Text fontSize="sm">Un dossier unique, un grade expliqué, et les services qui t&apos;aident à progresser.</Text>
            </Stack>
            <Stack className="bdt-cliquable" bg="nuit" color="white" borderRadius="24px" p="6" gap="3" gridColumn={{ md: "4 / span 1" }} gridRow={{ md: "1 / span 2" }} justify="flex-end" position="relative" overflow="hidden">
              <Box position="absolute" top="5" right="5" w="12" h="12" borderRadius="full" borderWidth="1px" borderColor="whiteAlpha.500" display="grid" placeItems="center">
                <LuArrowUpRight />
              </Box>
              <Heading as="h3" fontSize="xl" fontWeight="700">
                Pour les recruteurs
              </Heading>
              <Text fontSize="sm" color="whiteAlpha.800">
                Sur invitation du cabinet, ils consultent des profils anonymisés et font leur sélection. Le cabinet organise
                ensuite la mise en relation.
              </Text>
            </Stack>
            <Stack bg="brume" color="nuit" borderRadius="24px" p="6" gap="3" gridColumn={{ md: "1 / span 1" }}>
              <Box fontSize="28px">
                <LuLock />
              </Box>
              <Heading as="h3" fontSize="xl" fontWeight="700">
                Tes données protégées
              </Heading>
              <Text fontSize="sm" color="gris">
                Ton téléphone, ton e-mail et tes documents ne sont jamais montrés aux recruteurs. Tu choisis d&apos;être présenté ou non.
              </Text>
            </Stack>
            <Box gridColumn={{ md: "2 / span 2" }} gridRow={{ md: "2 / span 1" }} h={{ base: "220px", md: "auto" }} position="relative" overflow="hidden" borderRadius="24px">
              <Parallaxe vitesse={-0.08} position="absolute" inset="-30px 0">
                <Photo emplacement="echange" position="absolute" inset="0" borderRadius="0" />
              </Parallaxe>
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* Les grades */}
      <Container maxW="7xl" py={{ base: "16", md: "24" }} id="grades">
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1.2fr" }} gap="12" alignItems="center">
          <Stack gap="6">
            <TitreSection
              etiquette="Ton grade"
              titre="Tu sais où tu en es, et ce qu'il te reste à faire"
              texte="Ton grade est calculé à partir de quatre éléments : ton diplôme, ton test de langue, le coaching et ton niveau dans ton domaine. Il est d'abord provisoire, puis confirmé par le cabinet après vérification de tes pièces."
            />
            <Box>
              <BoutonPilule href="/inscription" variante="nuit">
                Découvrir mon grade
              </BoutonPilule>
            </Box>
          </Stack>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
            {GRADES.map(({ grade, texte }, i) => (
              <Apparition key={grade} sens="zoom" delai={i * 100} h="full">
              <Stack className="bdt-cliquable" h="full" bg="white" borderRadius="24px" p="5" boxShadow="carte" gap="3" borderTopWidth="5px" borderTopColor={`grade.${grade}`}>
                <HStack gap="3">
                  <PastilleGrade grade={grade} />
                  <Text fontWeight="700" color="nuit">
                    {LIBELLES_GRADES[grade].libelle}
                  </Text>
                </HStack>
                <Text color="gris" fontSize="sm">
                  {texte}
                </Text>
              </Stack>
              </Apparition>
            ))}
          </SimpleGrid>
        </Grid>
      </Container>

      {/* Appel final */}
      <Container maxW="7xl" pb={{ base: "16", md: "24" }}>
        <Apparition sens="zoom">
        <Grid templateColumns={{ base: "1fr", md: "1.3fr 1fr" }} bg="nuit" color="white" borderRadius="36px" overflow="hidden">
          <Stack gap="5" p={{ base: "8", md: "12" }} justify="center">
            <Heading as="h2" fontSize={{ base: "28px", md: "40px" }} lineHeight="1.15" fontWeight="700">
              Prêt à déposer{" "}
              <Text as="span" color="menthe">
                ton profil
              </Text>{" "}
              ?
            </Heading>
            <Text color="whiteAlpha.800">{MARQUE.avertissement}</Text>
            <Box>
              <BoutonPilule href="/inscription">Créer mon profil</BoutonPilule>
            </Box>
          </Stack>
          <Photo emplacement="groupe" borderRadius="0" minH={{ base: "240px", md: "auto" }} />
        </Grid>
        </Apparition>
      </Container>

      <Box as="footer" bg="nuit" color="whiteAlpha.800" py="10">
        <Container maxW="7xl">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap="6">
            <Stack gap="3" maxW="sm">
              <Logo clair />
              <Text fontSize="sm">{MARQUE.accroche}</Text>
            </Stack>
            <Stack gap="2" fontSize="sm">
              <Link href="/inscription">Créer mon profil</Link>
              <Link href="/connexion">Se connecter</Link>
              <Text>Recruteurs : l&apos;accès se fait sur invitation du cabinet.</Text>
            </Stack>
            <Text fontSize="sm" maxW="xs">
              Tes données sont protégées (loi camerounaise n° 2024/017). Tu peux demander leur suppression à tout moment.
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
