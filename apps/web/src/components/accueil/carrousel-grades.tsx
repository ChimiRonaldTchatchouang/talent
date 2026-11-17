"use client";

import { type Grade, LIBELLES_GRADES } from "@bdt/shared";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuQuote } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";

/** Ce que veut dire chaque grade, et la suite pour le candidat (règles de la section 6). */
const GRADES: { grade: Grade; titre: string; texte: string; suite: string }[] = [
  {
    grade: "A",
    titre: "Tout est réuni",
    texte: "Diplôme, test de langue réussi, coaching et bon niveau dans ton métier : ton profil est complet.",
    suite: "Dès que le cabinet a vérifié tes pièces, ton profil peut être présenté aux recruteurs.",
  },
  {
    grade: "B",
    titre: "Presque prêt",
    texte: "Tu as le diplôme, le test de langue et le niveau. Il ne te manque que le coaching.",
    suite: "Une demande de coaching auprès du cabinet, et tu passes au grade A.",
  },
  {
    grade: "C",
    titre: "Une étape à franchir",
    texte: "Tu as un diplôme, mais il te manque le test de langue ou une mise à niveau dans ton domaine.",
    suite: "Le cabinet te propose la formation aux tests de langue ou des séances de mise à niveau.",
  },
  {
    grade: "D",
    titre: "Ton expérience compte",
    texte: "Tu n'as pas de diplôme, mais tu as de l'expérience. Elle a de la valeur et elle est prise en compte.",
    suite: "Le cabinet t'oriente vers les services qui renforcent ton profil : langues et coaching.",
  },
  {
    grade: "HORS_BASSIN",
    titre: "On commence ensemble",
    texte: "Pas encore de diplôme ni d'expérience ? Ce n'est pas une porte fermée.",
    suite: "Le cabinet étudie ton dossier et te conseille sur la meilleure façon de démarrer.",
  },
];

/** Carrousel des grades : défilement au doigt sur téléphone, flèches et points sur ordinateur. */
export function CarrouselGrades() {
  const piste = useRef<HTMLDivElement>(null);
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    const majActif = () => {
      const cartes = Array.from(el.children) as HTMLElement[];
      const centre = el.scrollLeft + el.clientWidth / 2;
      let meilleur = 0;
      let ecartMin = Infinity;
      cartes.forEach((c, i) => {
        const ecart = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centre);
        if (ecart < ecartMin) {
          ecartMin = ecart;
          meilleur = i;
        }
      });
      setActif(meilleur);
    };
    el.addEventListener("scroll", majActif, { passive: true });
    majActif();
    return () => el.removeEventListener("scroll", majActif);
  }, []);

  const allerA = (i: number) => {
    const el = piste.current;
    const carte = el?.children[Math.max(0, Math.min(GRADES.length - 1, i))] as HTMLElement | undefined;
    if (!el || !carte) return;
    el.scrollTo({ left: carte.offsetLeft - (el.clientWidth - carte.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <Stack gap="6">
      <Box
        ref={piste}
        display="flex"
        gap={{ base: "4", md: "6" }}
        overflowX="auto"
        scrollSnapType="x mandatory"
        px={{ base: "4", md: "calc(50vw - 260px)" }}
        py="4"
        css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
        aria-label="Les grades"
      >
        {GRADES.map(({ grade, titre, texte, suite }, i) => {
          const couleur = grade === "HORS_BASSIN" ? "grade.hors" : `grade.${grade}`;
          return (
            <Box
              key={grade}
              className="bdt-carte-grade"
              data-actif={i === actif}
              flex={{ base: "0 0 86%", md: "0 0 520px" }}
              scrollSnapAlign="center"
              bg="white"
              borderRadius="28px"
              boxShadow="carte"
              borderWidth="1px"
              borderColor="nuit/5"
              overflow="hidden"
              display="flex"
              flexDirection={{ base: "column", sm: "row" }}
              onClick={() => allerA(i)}
            >
              {/* Panneau coloré du grade (à la place de la photo du modèle) */}
              <Stack
                bg={couleur}
                color="white"
                w={{ base: "full", sm: "40%" }}
                p="6"
                justify="space-between"
                minH={{ base: "150px", sm: "auto" }}
                position="relative"
                overflow="hidden"
              >
                <Box position="absolute" right="-10" bottom="-10" w="36" h="36" borderRadius="full" bg="whiteAlpha.200" />
                <Text fontSize={{ base: "64px", sm: "88px" }} fontWeight="700" lineHeight="1" position="relative">
                  {LIBELLES_GRADES[grade].lettre}
                </Text>
                <Text fontWeight="600" position="relative">
                  {LIBELLES_GRADES[grade].libelle}
                </Text>
              </Stack>
              <Stack flex="1" p="6" gap="3">
                <Box color="emeraude.500" fontSize="2xl">
                  <LuQuote />
                </Box>
                <Text className="bdt-encadre-simple" fontWeight="700" color="emeraude.700" fontSize="lg" alignSelf="flex-start">
                  {titre}
                </Text>
                <Text color="gris" fontSize="sm">
                  {texte}
                </Text>
                <HStack gap="2.5" mt="auto" pt="3" borderTopWidth="1px" borderColor="nuit/5" align="flex-start">
                  {grade !== "HORS_BASSIN" && <PastilleGrade grade={grade} taille="sm" />}
                  <Text fontSize="sm" color="nuit" fontWeight="500">
                    {suite}
                  </Text>
                </HStack>
              </Stack>
            </Box>
          );
        })}
      </Box>

      <HStack justify="center" gap="4">
        <BoutonRond label="Grade précédent" onClick={() => allerA(actif - 1)} desactive={actif === 0}>
          <LuArrowLeft />
        </BoutonRond>
        <HStack gap="2">
          {GRADES.map(({ grade }, i) => (
            <Box
              as="button"
              key={grade}
              aria-label={`Voir le grade ${LIBELLES_GRADES[grade].lettre}`}
              onClick={() => allerA(i)}
              h="2.5"
              w={i === actif ? "8" : "2.5"}
              borderRadius="full"
              bg={i === actif ? "emeraude.600" : "nuit/15"}
              transition="all 0.3s ease"
              cursor="pointer"
            />
          ))}
        </HStack>
        <BoutonRond label="Grade suivant" onClick={() => allerA(actif + 1)} desactive={actif === GRADES.length - 1}>
          <LuArrowRight />
        </BoutonRond>
      </HStack>
    </Stack>
  );
}

function BoutonRond({ label, onClick, desactive, children }: { label: string; onClick: () => void; desactive: boolean; children: React.ReactNode }) {
  return (
    <Box
      as="button"
      aria-label={label}
      onClick={onClick}
      aria-disabled={desactive}
      w="11"
      h="11"
      borderRadius="full"
      display="grid"
      placeItems="center"
      bg={desactive ? "white" : "nuit"}
      color={desactive ? "nuit/30" : "white"}
      borderWidth="1px"
      borderColor="nuit/10"
      cursor={desactive ? "default" : "pointer"}
      transition="transform 0.2s ease, background-color 0.2s ease"
      _hover={desactive ? undefined : { transform: "scale(1.08)", bg: "emeraude.600" }}
      _active={desactive ? undefined : { transform: "scale(0.94)" }}
    >
      {children}
    </Box>
  );
}
