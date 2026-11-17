"use client";

import { Box, Button, Field, HStack, Input, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { Dossier, ExperienceSaisie, ListesReference } from "@/lib/types";
import { useLangue } from "@/lib/preferences";
import type { Champ, Option, Valeurs } from "./ecrans";
import { useTraduction } from "./traductions";

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
      bg={choisi ? "emeraude.subtle" : "brume"}
      cursor="pointer"
      className="bdt-carte-choix"
    >
      <button type="button" onClick={onClick} aria-pressed={choisi}>
        <Text fontWeight="600" color="titre">
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
  const { tr } = useLangue();
  const maj = (i: number, cle: keyof ExperienceSaisie, v: string | null) =>
    onChange(valeur.map((e, j) => (j === i ? { ...e, [cle]: v === "" ? null : v } : e)));
  return (
    <Stack gap="4">
      {valeur.map((e, i) => (
        <Stack key={i} gap="3" bg="brume" borderRadius="carte" p="4">
          <HStack justify="space-between">
            <Text fontWeight="600" color="titre">
              {tr("Expérience", "Job")} {i + 1}
            </Text>
            <Button size="xs" variant="ghost" onClick={() => onChange(valeur.filter((_, j) => j !== i))} aria-label={`${tr("Retirer l'expérience", "Remove job")} ${i + 1}`}>
              <LuTrash2 /> {tr("Retirer", "Remove")}
            </Button>
          </HStack>
          <Field.Root>
            <Field.Label>{tr("Employeur", "Employer")}</Field.Label>
            <Input bg="surface" size="lg" value={e.employeur} onChange={(x) => maj(i, "employeur", x.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>{tr("Poste", "Position")}</Field.Label>
            <Input bg="surface" size="lg" value={e.poste} onChange={(x) => maj(i, "poste", x.target.value)} />
          </Field.Root>
          <SimpleGrid columns={2} gap="3">
            <Field.Root>
              <Field.Label>{tr("Début", "Start")}</Field.Label>
              <Input bg="surface" size="lg" type="month" value={e.debut ?? ""} onChange={(x) => maj(i, "debut", x.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>{tr("Fin", "End")}</Field.Label>
              <Input bg="surface" size="lg" type="month" value={e.fin ?? ""} onChange={(x) => maj(i, "fin", x.target.value)} />
              <Field.HelperText>{tr("Vide si en cours", "Empty if current")}</Field.HelperText>
            </Field.Root>
          </SimpleGrid>
          <Field.Root>
            <Field.Label>{tr("Ville", "City")}</Field.Label>
            <Input bg="surface" size="lg" value={e.ville ?? ""} onChange={(x) => maj(i, "ville", x.target.value)} />
          </Field.Root>
        </Stack>
      ))}
      <Button
        variant="outline"
        colorPalette="emeraude"
        size="lg"
        onClick={() => onChange([...valeur, { employeur: "", poste: "", debut: null, fin: null, ville: null }])}
      >
        <LuPlus /> {tr("Ajouter une expérience", "Add a job")}
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
  const { tr } = useLangue();
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
      toaster.create({ type: "success", title: tr("Compétence ajoutée. Le cabinet va la valider.", "Skill added. The agency will approve it.") });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!domaineId) return <Text color="gris">{tr("Choisis d'abord ton domaine à l'écran précédent.", "First choose your field on the previous screen.")}</Text>;
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
              {"statut" in c && c.statut === "PROPOSEE" && tr(" (à valider)", " (pending)")}
              {choisi && <LuX />}
            </Button>
          );
        })}
      </HStack>
      <Field.Root>
        <Field.Label>{tr("Une compétence manque ?", "Is a skill missing?")}</Field.Label>
        <HStack w="full">
          <Input bg="brume" size="lg" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={tr("Ex. Pose de faux plafond", "E.g. False ceiling installation")} />
          <Button size="lg" variant="outline" colorPalette="emeraude" onClick={proposer} loading={envoi} disabled={saisie.trim().length < 2}>
            {tr("Proposer", "Suggest")}
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
  const t = useTraduction();
  const { tr } = useLangue();
  const libelle = (
    <Field.Label fontSize="md">
      {t(champ.libelle)}
      {champ.facultatif && (
        <Text as="span" color="gris" fontWeight="400">
          {" "}
          {tr("(facultatif)", "(optional)")}
        </Text>
      )}
    </Field.Label>
  );

  let saisie: React.ReactNode;
  switch (champ.type) {
    case "ouiNon":
      saisie = (
        <SimpleGrid columns={2} gap="3" w="full">
          <CarteChoix libelle={tr("Oui", "Yes")} choisi={v === true} onClick={() => setValeur(champ.cle, true)} />
          <CarteChoix libelle={tr("Non", "No")} choisi={v === false} onClick={() => setValeur(champ.cle, false)} />
        </SimpleGrid>
      );
      break;
    case "choix":
      saisie = (
        <Stack gap="2" w="full">
          {champ.options.map((o: Option) => (
            <CarteChoix key={o.valeur} libelle={t(o.libelle)} aide={t(o.aide)} choisi={v === o.valeur} onClick={() => setValeur(champ.cle, o.valeur)} />
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
              libelle={liste.includes(o) ? `✓ ${t(o)}` : t(o)}
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
            <option value="">{tr("Choisir…", "Choose…")}</option>
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
          placeholder={t(champ.placeholder)}
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
          placeholder={t(champ.placeholder)}
          value={(v as string) ?? ""}
          onChange={(e) => setValeur(champ.cle, e.target.value)}
        />
      );
  }

  const sansLibelle = champ.type === "experiences" || champ.type === "competences";
  return (
    <Field.Root invalid={!!erreur}>
      {!sansLibelle && libelle}
      {champ.aide && <Field.HelperText>{t(champ.aide)}</Field.HelperText>}
      {saisie}
      <Field.ErrorText>{erreur}</Field.ErrorText>
    </Field.Root>
  );
}
