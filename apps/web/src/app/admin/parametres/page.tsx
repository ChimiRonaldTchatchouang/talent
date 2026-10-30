"use client";

import {
  ELEMENTS_GRADE,
  LIBELLES_ELEMENTS,
  NIVEAUX_BUREAUTIQUE,
  type ParametresClassement,
  TYPES_PIECE,
} from "@bdt/shared";
import { Button, Checkbox, Field, Heading, Input, NativeSelect, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { VersionParametres } from "@/lib/types";

const LIBELLES_BUREAUTIQUE = { DEBUTANT: "Débutant", MOYEN: "Moyen", BON: "Bon" } as const;
const LIBELLES_PIECES = {
  IDENTITE: "Pièce d'identité ou passeport",
  DIPLOME: "Dernier diplôme",
  ATTESTATION_LANGUE: "Attestation de test de langue",
  CERTIFICAT_TRAVAIL: "Certificats de travail",
  CV: "CV",
} as const;

function basculer<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

export default function PageParametres() {
  const [version, setVersion] = useState<VersionParametres | null>(null);
  const [valeurs, setValeurs] = useState<ParametresClassement | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api<VersionParametres>("/admin/parametres-classement")
      .then((v) => {
        setVersion(v);
        setValeurs(v.valeurs);
      })
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!valeurs) return;
    setEnvoi(true);
    try {
      const v = await api<VersionParametres>("/admin/parametres-classement", { methode: "PUT", corps: valeurs });
      setVersion(v);
      toaster.create({ type: "success", title: "Paramètres enregistrés." });
    } catch (err) {
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!valeurs || !version) return <Spinner color="emeraude.600" />;

  return (
    <Stack gap="6" as="form" onSubmit={enregistrer}>
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          Paramètres du classement
        </Heading>
        <Text color="gris">
          {version.version
            ? `Version n° ${version.version} en vigueur depuis le ${new Date(version.creeLe!).toLocaleString("fr-FR")}.`
            : "Valeurs par défaut proposées par Nextiaa, à confirmer par le cabinet."}{" "}
          Chaque modification est conservée et inscrite au journal.
        </Text>
      </Stack>

      <Carte>
        <Heading as="h2" size="md" color="nuit" mb="1">
          Niveau dans le domaine (avant évaluation par le cabinet)
        </Heading>
        <Text color="gris" mb="4">
          Le niveau est considéré comme acquis à titre provisoire si les deux conditions sont réunies.
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          <Field.Root>
            <Field.Label>Niveau minimum en bureautique</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                bg="brume"
                value={valeurs.bureautiqueMinimum}
                onChange={(e) =>
                  setValeurs({ ...valeurs, bureautiqueMinimum: e.target.value as ParametresClassement["bureautiqueMinimum"] })
                }
              >
                {NIVEAUX_BUREAUTIQUE.map((n) => (
                  <option key={n} value={n}>
                    {LIBELLES_BUREAUTIQUE[n]}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>Expérience minimum (années)</Field.Label>
            <Input
              bg="brume"
              type="number"
              min={0}
              max={40}
              value={valeurs.experienceMinimumAnnees}
              onChange={(e) => setValeurs({ ...valeurs, experienceMinimumAnnees: Number(e.target.value) })}
            />
          </Field.Root>
        </SimpleGrid>
      </Carte>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
        <Carte>
          <Heading as="h2" size="md" color="nuit" mb="1">
            Services suggérés au grade D
          </Heading>
          <Text color="gris" mb="4">
            Éléments dont le service est proposé par défaut aux candidats sans diplôme.
          </Text>
          <Stack gap="3">
            {ELEMENTS_GRADE.filter((e) => e !== "DIPLOME").map((e) => (
              <Checkbox.Root
                key={e}
                colorPalette="emeraude"
                checked={valeurs.elementsSuggeresGradeD.includes(e)}
                onCheckedChange={() =>
                  setValeurs({ ...valeurs, elementsSuggeresGradeD: basculer(valeurs.elementsSuggeresGradeD, e) })
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{LIBELLES_ELEMENTS[e]}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Stack>
        </Carte>

        <Carte>
          <Heading as="h2" size="md" color="nuit" mb="1">
            Pièces vérifiées pour confirmer un grade A
          </Heading>
          <Text color="gris" mb="4">
            Un grade A ne peut pas être confirmé tant que ces pièces ne sont pas vérifiées.
          </Text>
          <Stack gap="3">
            {TYPES_PIECE.map((p) => (
              <Checkbox.Root
                key={p}
                colorPalette="emeraude"
                checked={valeurs.piecesRequisesGradeA.includes(p)}
                onCheckedChange={() =>
                  setValeurs({ ...valeurs, piecesRequisesGradeA: basculer(valeurs.piecesRequisesGradeA, p) })
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{LIBELLES_PIECES[p]}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Stack>
        </Carte>
      </SimpleGrid>

      <Carte>
        <Field.Root maxW="sm">
          <Field.Label>Alerte avant la fin d&apos;un accès recruteur (jours)</Field.Label>
          <Input
            bg="brume"
            type="number"
            min={1}
            max={30}
            value={valeurs.joursAlerteFinAccesRecruteur}
            onChange={(e) => setValeurs({ ...valeurs, joursAlerteFinAccesRecruteur: Number(e.target.value) })}
          />
        </Field.Root>
      </Carte>

      <Button type="submit" size="lg" colorPalette="emeraude" alignSelf="flex-start" loading={envoi}>
        Enregistrer les paramètres
      </Button>
    </Stack>
  );
}
