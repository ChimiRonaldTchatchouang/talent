"use client";

import { Alert, Box, Button, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { CarteGrade, CarteService, LigneElement } from "@/components/candidat/grade";
import { api, messageErreur } from "@/lib/api";
import type { Classement } from "@/lib/types";

const EXPLICATIONS = [
  ["A", "Diplôme, test de langue, coaching et niveau dans ton domaine : tout est réuni."],
  ["B", "Diplôme, test de langue et niveau sont là ; il ne manque que le coaching."],
  ["C", "Tu as un diplôme, mais il manque le test de langue et/ou le niveau dans ton domaine."],
  ["D", "Tu n'as pas déclaré de diplôme, mais tu as de l'expérience."],
  ["Hors bassin", "Ni diplôme ni expérience déclarés : le cabinet t'aidera à t'orienter."],
];

/** Écran « Pourquoi ce grade ? » (W3). */
export default function PourquoiCeGrade() {
  const [c, setC] = useState<Classement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api<Classement>("/candidat/classement").then(setC).catch((e) => setErreur(messageErreur(e)));
  }, []);

  if (erreur) {
    return (
      <Alert.Root status="error" borderRadius="carte">
        <Alert.Indicator />
        <Alert.Title>{erreur}</Alert.Title>
      </Alert.Root>
    );
  }
  if (!c) return <Spinner color="emeraude.600" />;
  if (!c.disponible) {
    return (
      <Stack gap="4">
        <Heading as="h1" size="2xl" color="nuit">
          Pourquoi ce grade ?
        </Heading>
        <Text color="gris">Ton grade s&apos;affichera quand toutes les étapes de ton dossier seront remplies.</Text>
        <Button asChild colorPalette="emeraude" size="lg">
          <Link href="/candidat">Continuer mon dossier</Link>
        </Button>
      </Stack>
    );
  }

  const suggeres = c.services.filter((s) => s.suggere || s.etat !== "SUGGERE");
  const autres = c.services.filter((s) => !s.suggere && s.etat === "SUGGERE");

  return (
    <Stack gap="5">
      <Heading as="h1" size="2xl" color="nuit">
        Pourquoi ce grade ?
      </Heading>
      <Carte>
        <CarteGrade c={c} />
        <Text color="gris" mt="4" fontSize="sm">
          {c.etat === "PROVISOIRE"
            ? "Ce grade est provisoire : il est calculé à partir de tes réponses. Le cabinet le confirmera après avoir vérifié tes pièces."
            : c.etat === "CONFIRME"
              ? "Ce grade a été confirmé par le cabinet."
              : "Ce grade a été fixé par le cabinet après examen de ton dossier."}
        </Text>
      </Carte>

      <Stack gap="2">
        <Text fontWeight="700" color="nuit">
          Les quatre éléments évalués
        </Text>
        {c.elements.map((e) => (
          <LigneElement key={e.element} e={e} />
        ))}
      </Stack>

      {suggeres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="nuit">
            Les services qui peuvent t&apos;aider
          </Text>
          {suggeres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}
      {autres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="nuit">
            Autres services du cabinet
          </Text>
          {autres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}

      <Carte bg="brume" boxShadow="none">
        <Text fontWeight="700" color="nuit" mb="2">
          Comment les grades sont calculés
        </Text>
        <Stack gap="2" fontSize="sm">
          {EXPLICATIONS.map(([g, t]) => (
            <Box key={g}>
              <strong>{g} :</strong> {t}
            </Box>
          ))}
        </Stack>
      </Carte>

      <Button asChild variant="plain" color="gris">
        <Link href="/candidat">Retour à mon espace</Link>
      </Button>
    </Stack>
  );
}
