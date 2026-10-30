import { LIBELLES_GRADES, type Grade } from "@bdt/shared";
import { Badge, Box, HStack, Text } from "@chakra-ui/react";

const COULEUR_GRADE: Record<Grade, string> = {
  A: "grade.A",
  B: "grade.B",
  C: "grade.C",
  D: "grade.D",
  HORS_BASSIN: "grade.hors",
};

/** Pastille de grade : la lettre accompagne toujours la couleur. */
export function PastilleGrade({ grade, taille = "md" }: { grade: Grade; taille?: "sm" | "md" | "lg" }) {
  const dim = { sm: "7", md: "10", lg: "16" }[taille];
  const police = { sm: "sm", md: "lg", lg: "3xl" }[taille];
  return (
    <Box
      w={dim}
      h={dim}
      borderRadius="full"
      bg={COULEUR_GRADE[grade]}
      color="white"
      display="grid"
      placeItems="center"
      fontWeight="700"
      fontSize={police}
      flexShrink={0}
      aria-label={`Grade ${LIBELLES_GRADES[grade].lettre}`}
    >
      {LIBELLES_GRADES[grade].lettre}
    </Box>
  );
}

export function BadgeGrade({ grade }: { grade: Grade }) {
  return (
    <HStack gap="2">
      <PastilleGrade grade={grade} taille="sm" />
      <Text fontWeight="600" color={COULEUR_GRADE[grade]}>
        {LIBELLES_GRADES[grade].libelle}
      </Text>
    </HStack>
  );
}

export type EtatBadge = "VERIFIE" | "EN_ATTENTE" | "REFUSE" | "PROVISOIRE" | "CONFIRME" | "ACTIF" | "DESACTIVE";

const STYLES_ETAT: Record<EtatBadge, { libelle: string; bg: string; color: string }> = {
  VERIFIE: { libelle: "Vérifié", bg: "etat.verifie", color: "nuit" },
  EN_ATTENTE: { libelle: "En attente", bg: "etat.attente", color: "nuit" },
  REFUSE: { libelle: "Refusé", bg: "etat.refuse", color: "etat.refuseTexte" },
  PROVISOIRE: { libelle: "Provisoire", bg: "white", color: "gris" },
  CONFIRME: { libelle: "Confirmé", bg: "emeraude.600", color: "white" },
  ACTIF: { libelle: "Actif", bg: "etat.verifie", color: "nuit" },
  DESACTIVE: { libelle: "Désactivé", bg: "brume", color: "gris" },
};

export function BadgeEtat({ etat }: { etat: EtatBadge }) {
  const s = STYLES_ETAT[etat];
  return (
    <Badge
      bg={s.bg}
      color={s.color}
      borderRadius="full"
      px="3"
      py="1"
      fontWeight="600"
      borderWidth={etat === "PROVISOIRE" ? "1px" : 0}
      borderStyle="dashed"
      borderColor="gris"
    >
      {s.libelle}
    </Badge>
  );
}
