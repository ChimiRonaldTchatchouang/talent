"use client";

import { Alert, Box, Button, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { CarteGrade, CarteService, LigneElement } from "@/components/candidat/grade";
import { api, messageErreur } from "@/lib/api";
import { useLangue } from "@/lib/preferences";
import type { Classement } from "@/lib/types";

const EXPLICATIONS: [string, string, string, string][] = [
  ["A", "A", "Diplôme, test de langue, coaching et niveau dans ton domaine : tout est réuni.", "Degree, language test, coaching and level in your field: you have it all."],
  ["B", "B", "Diplôme, test de langue et niveau sont là ; il ne manque que le coaching.", "Degree, language test and level are there; only coaching is missing."],
  ["C", "C", "Tu as un diplôme, mais il manque le test de langue et/ou le niveau dans ton domaine.", "You have a degree, but the language test and/or level in your field is missing."],
  ["D", "D", "Tu n'as pas déclaré de diplôme, mais tu as de l'expérience.", "You haven't declared a degree, but you have experience."],
  ["Hors bassin", "Outside the pool", "Ni diplôme ni expérience déclarés : le cabinet t'aidera à t'orienter.", "No degree or experience declared: the agency will help guide you."],
];

/** Écran « Pourquoi ce grade ? » (W3). */
export default function PourquoiCeGrade() {
  const [c, setC] = useState<Classement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const { tr } = useLangue();

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
        <Heading as="h1" size="2xl" color="titre">
          {tr("Pourquoi ce grade ?", "Why this grade?")}
        </Heading>
        <Text color="gris">{tr("Ton grade s'affichera quand toutes les étapes de ton dossier seront remplies.", "Your grade will appear once all the steps of your file are filled in.")}</Text>
        <Button asChild colorPalette="emeraude" size="lg">
          <Link href="/candidat">{tr("Continuer mon dossier", "Continue my file")}</Link>
        </Button>
      </Stack>
    );
  }

  const suggeres = c.services.filter((s) => s.suggere || s.etat !== "SUGGERE");
  const autres = c.services.filter((s) => !s.suggere && s.etat === "SUGGERE");

  return (
    <Stack gap="5">
      <Heading as="h1" size="2xl" color="titre">
        {tr("Pourquoi ce grade ?", "Why this grade?")}
      </Heading>
      <Carte>
        <CarteGrade c={c} />
        <Text color="gris" mt="4" fontSize="sm">
          {c.etat === "PROVISOIRE"
            ? tr("Ce grade est provisoire : il est calculé à partir de tes réponses. Le cabinet le confirmera après avoir vérifié tes pièces.", "This grade is provisional: it is calculated from your answers. The agency will confirm it after checking your documents.")
            : c.etat === "CONFIRME"
              ? tr("Ce grade a été confirmé par le cabinet.", "This grade has been confirmed by the agency.")
              : tr("Ce grade a été fixé par le cabinet après examen de ton dossier.", "This grade was set by the agency after reviewing your file.")}
        </Text>
      </Carte>

      <Stack gap="2">
        <Text fontWeight="700" color="titre">
          {tr("Les quatre éléments évalués", "The four elements assessed")}
        </Text>
        {c.elements.map((e) => (
          <LigneElement key={e.element} e={e} />
        ))}
      </Stack>

      {suggeres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="titre">
            {tr("Les services qui peuvent t'aider", "Services that can help you")}
          </Text>
          {suggeres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}
      {autres.length > 0 && (
        <Stack gap="2">
          <Text fontWeight="700" color="titre">
            {tr("Autres services du cabinet", "Other agency services")}
          </Text>
          {autres.map((s) => (
            <CarteService key={s.id} s={s} onChange={setC} />
          ))}
        </Stack>
      )}

      <Carte bg="brume" boxShadow="none">
        <Text fontWeight="700" color="titre" mb="2">
          {tr("Comment les grades sont calculés", "How grades are calculated")}
        </Text>
        <Stack gap="2" fontSize="sm">
          {EXPLICATIONS.map(([gFr, gEn, fr, en]) => (
            <Box key={gFr}>
              <strong>{tr(gFr, gEn)} :</strong> {tr(fr, en)}
            </Box>
          ))}
        </Stack>
      </Carte>

      <Button asChild variant="plain" color="gris">
        <Link href="/candidat">{tr("Retour à mon espace", "Back to my space")}</Link>
      </Button>
    </Stack>
  );
}
