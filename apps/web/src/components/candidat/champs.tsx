"use client";

import { Box, Button, Field, HStack, Input, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { Dossier, ExperienceSaisie, ListesReference } from "@/lib/types";
import type { Champ, Option, Valeurs } from "./ecrans";

/** Carte de choix large, facile à toucher sur téléphone. */
function CarteChoix({ choisi, onClick, libelle, aide }: { choisi: boolean; onClick: () => void; libelle: string; aide?: string }) {
  return (
    <Box
      asChild
      textAlign="left"
      w="full"
      minH="52px"
      px="4"
      py="3"
      borderRadius="carte"
      borderWidth="2px"
      borderColor={choisi ? "emeraude.600" : "brume"}
      bg={choisi ? "emeraude.50" : "brume"}
      cursor="pointer"
    >
      <button type="button" onClick={onClick} aria-pressed={choisi}>
        <Text fontWeight="600" color="nuit">
          {libelle}
        </Text>
        {aide && (
          <Text fontSize="sm" color="gris">
            {aide}
          </Text>
        )}
      </button>
    </Box>
  );
}

function ChampExperiences({ valeur, onChange }: { valeur: ExperienceSaisie[]; onChange: (v: ExperienceSaisie[]) => void }) {
  const maj = (i: number, cle: keyof ExperienceSaisie, v: string | null) =>
    onChange(valeur.map((e, j) => (j === i ? { ...e, [cle]: v === "" ? null : v } : e)));
  return (
    <Stack gap="4">
      {valeur.map((e, i) => (
        <Stack key={i} gap="3" bg="brume" borderRadius="carte" p="4">
          <HStack justify="space-between">
            <Text fontWeight="600" color="nuit">
              Expérience {i + 1}
            </Text>
            <Button size="xs" variant="ghost" onClick={() => onChange(valeur.filter((_, j) => j !== i))} aria-label={`Retirer l'expérience ${i + 1}`}>
              <LuTrash2 /> Retirer
            </Button>
          </HStack>
          <Field.Root>
            <Field.Label>Employeur</Field.Label>
            <Input bg="white" size="lg" value={e.employeur} onChange={(x) => maj(i, "employeur", x.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>Poste</Field.Label>
            <Input bg="white" size="lg" value={e.poste} onChange={(x) => maj(i, "poste", x.target.value)} />
          </Field.Root>
          <SimpleGrid columns={2} gap="3">
            <Field.Root>
              <Field.Label>Début</Field.Label>
              <Input bg="white" size="lg" type="month" value={e.debut ?? ""} onChange={(x) => maj(i, "debut", x.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Fin</Field.Label>
              <Input bg="white" size="lg" type="month" value={e.fin ?? ""} onChange={(x) => maj(i, "fin", x.target.value)} />
              <Field.HelperText>Vide si en cours</Field.HelperText>
            </Field.Root>
          </SimpleGrid>
          <Field.Root>
            <Field.Label>Ville</Field.Label>
            <Input bg="white" size="lg" value={e.ville ?? ""} onChange={(x) => maj(i, "ville", x.target.value)} />
          </Field.Root>
        </Stack>
      ))}
      <Button
        variant="outline"
        colorPalette="emeraude"
        size="lg"
        onClick={() => onChange([...valeur, { employeur: "", poste: "", debut: null, fin: null, ville: null }])}
      >
        <LuPlus /> Ajouter une expérience
      </Button>
    </Stack>
  );
}

function ChampCompetences({
  valeurs,
  valeur,
  onChange,
  listes,
  dossier,
}: {
  valeurs: Valeurs;
  valeur: string[];
  onChange: (v: string[]) => void;
  listes: ListesReference;
  dossier: Dossier;
}) {
  const [proposees, setProposees] = useState(dossier.competences.filter((c) => c.statut === "PROPOSEE"));
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const domaineId = valeurs.domaineId as string | null;
  const disponibles = [
    ...listes.competences.filter((c) => c.domaineId === domaineId),
    // Compétences déjà choisies d'un autre domaine (le candidat a changé de domaine) : gardées visibles.
    ...dossier.competences.filter((c) => c.statut === "VALIDEE" && !listes.competences.some((l) => l.id === c.id && l.domaineId === domaineId)),
  ];
  const basculer = (id: string) => onChange(valeur.includes(id) ? valeur.filter((x) => x !== id) : [...valeur, id]);

  async function proposer() {
    if (!domaineId) return;
    setEnvoi(true);
    try {
      const { competence } = await api<{ competence: { id: string; nom: string; domaine: string; statut: string } }>("/candidat/competences", {
        methode: "POST",
        corps: { domaineId, nom: saisie },
      });
      if (competence.statut === "PROPOSEE" && !proposees.some((p) => p.id === competence.id)) setProposees([...proposees, competence]);
      if (!valeur.includes(competence.id)) onChange([...valeur, competence.id]);
      setSaisie("");
      toaster.create({ type: "success", title: "Compétence ajoutée. Le cabinet va la valider." });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!domaineId) return <Text color="gris">Choisis d&apos;abord ton domaine à l&apos;écran précédent.</Text>;
  return (
    <Stack gap="4">
      <HStack wrap="wrap" gap="2">
        {[...disponibles, ...proposees].map((c) => {
          const choisi = valeur.includes(c.id);
          return (
            <Button
              key={c.id}
              size="sm"
              borderRadius="full"
              variant={choisi ? "solid" : "outline"}
              colorPalette="emeraude"
              onClick={() => basculer(c.id)}
              aria-pressed={choisi}
            >
              {c.nom}
              {"statut" in c && c.statut === "PROPOSEE" && " (à valider)"}
              {choisi && <LuX />}
            </Button>
          );
        })}
      </HStack>
      <Field.Root>
        <Field.Label>Une compétence manque ?</Field.Label>
        <HStack w="full">
          <Input bg="brume" size="lg" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Ex. Pose de faux plafond" />
          <Button size="lg" variant="outline" colorPalette="emeraude" onClick={proposer} loading={envoi} disabled={saisie.trim().length < 2}>
            Proposer
          </Button>
        </HStack>
      </Field.Root>
    </Stack>
  );
}

/** Affiche un champ du formulaire selon son type. */
export function ChampFormulaire({
  champ,
  valeurs,
  setValeur,
  erreur,
  listes,
  dossier,
}: {
  champ: Champ;
  valeurs: Valeurs;
  setValeur: (cle: string, v: unknown) => void;
  erreur?: string;
  listes: ListesReference;
  dossier: Dossier;
}) {
  const v = valeurs[champ.cle];
  const libelle = (
    <Field.Label fontSize="md">
      {champ.libelle}
      {champ.facultatif && (
        <Text as="span" color="gris" fontWeight="400">
          {" "}
          (facultatif)
        </Text>
      )}
    </Field.Label>
  );

  let saisie: React.ReactNode;
  switch (champ.type) {
    case "ouiNon":
      saisie = (
        <SimpleGrid columns={2} gap="3" w="full">
          <CarteChoix libelle="Oui" choisi={v === true} onClick={() => setValeur(champ.cle, true)} />
          <CarteChoix libelle="Non" choisi={v === false} onClick={() => setValeur(champ.cle, false)} />
        </SimpleGrid>
      );
      break;
    case "choix":
      saisie = (
        <Stack gap="2" w="full">
          {champ.options.map((o: Option) => (
            <CarteChoix key={o.valeur} libelle={o.libelle} aide={o.aide} choisi={v === o.valeur} onClick={() => setValeur(champ.cle, o.valeur)} />
          ))}
        </Stack>
      );
      break;
    case "multi": {
      const liste = (v as string[] | undefined) ?? [];
      saisie = (
        <SimpleGrid columns={2} gap="2" w="full">
          {champ.options.map((o) => (
            <CarteChoix
              key={o}
              libelle={liste.includes(o) ? `✓ ${o}` : o}
              choisi={liste.includes(o)}
              onClick={() => setValeur(champ.cle, liste.includes(o) ? liste.filter((x) => x !== o) : [...liste, o])}
            />
          ))}
        </SimpleGrid>
      );
      break;
    }
    case "liste":
      saisie = (
        <NativeSelect.Root size="lg">
          <NativeSelect.Field bg="brume" value={(v as string) ?? ""} onChange={(e) => setValeur(champ.cle, e.target.value || null)}>
            <option value="">Choisir…</option>
            {champ.options(listes, dossier).map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      );
      break;
    case "nombre":
      saisie = (
        <Input
          size="lg"
          bg="brume"
          inputMode={champ.entier ? "numeric" : "decimal"}
          placeholder={champ.placeholder}
          value={v === null || v === undefined ? "" : String(v)}
          onChange={(e) => {
            const brut = e.target.value.replace(",", ".");
            if (brut === "") return setValeur(champ.cle, null);
            const n = champ.entier ? parseInt(brut, 10) : Number(brut);
            setValeur(champ.cle, Number.isNaN(n) ? null : n);
          }}
        />
      );
      break;
    case "experiences":
      saisie = <ChampExperiences valeur={(v as ExperienceSaisie[]) ?? []} onChange={(x) => setValeur(champ.cle, x)} />;
      break;
    case "competences":
      saisie = (
        <ChampCompetences valeurs={valeurs} valeur={(v as string[]) ?? []} onChange={(x) => setValeur(champ.cle, x)} listes={listes} dossier={dossier} />
      );
      break;
    default:
      saisie = (
        <Input
          size="lg"
          bg="brume"
          type={champ.type === "mois" ? "month" : champ.type}
          inputMode={champ.type === "tel" ? "tel" : champ.type === "email" ? "email" : undefined}
          placeholder={champ.placeholder}
          value={(v as string) ?? ""}
          onChange={(e) => setValeur(champ.cle, e.target.value)}
        />
      );
  }

  const sansLibelle = champ.type === "experiences" || champ.type === "competences";
  return (
    <Field.Root invalid={!!erreur}>
      {!sansLibelle && libelle}
      {champ.aide && <Field.HelperText>{champ.aide}</Field.HelperText>}
      {saisie}
      <Field.ErrorText>{erreur}</Field.ErrorText>
    </Field.Root>
  );
}
