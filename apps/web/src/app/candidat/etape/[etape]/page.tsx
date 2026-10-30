"use client";

import { LIBELLES_ETAPES } from "@bdt/shared";
import { Alert, Box, Button, Heading, HStack, Progress, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { ChampFormulaire } from "@/components/candidat/champs";
import { clesEtape, ECRANS, valeursInitiales, type Valeurs } from "@/components/candidat/ecrans";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import { adresseEtape, etapeSuivante, useDossier } from "@/lib/dossier";
import type { ExperienceSaisie, ReponseDossier } from "@/lib/types";

type EtapeFormulaire = keyof typeof ECRANS;

export default function PageEtape() {
  const params = useParams<{ etape: string }>();
  const etape = params.etape.toUpperCase() as EtapeFormulaire;
  const router = useRouter();
  const { reponse, listes, setReponse } = useDossier(true);
  const [valeurs, setValeurs] = useState<Valeurs | null>(null);
  const [index, setIndex] = useState(0);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    if (reponse && !valeurs) setValeurs(valeursInitiales(reponse.dossier));
  }, [reponse, valeurs]);

  const ecrans = useMemo(
    () => (ECRANS[etape] ?? []).filter((e) => !valeurs || !e.visible || e.visible(valeurs)),
    [etape, valeurs],
  );

  if (!ECRANS[etape]) {
    return (
      <Alert.Root status="warning" borderRadius="carte">
        <Alert.Indicator />
        <Alert.Title>Cette étape n&apos;existe pas.</Alert.Title>
      </Alert.Root>
    );
  }
  if (!reponse || !listes || !valeurs) return <Spinner color="emeraude.600" />;

  const ecran = ecrans[Math.min(index, ecrans.length - 1)]!;
  const dernier = index >= ecrans.length - 1;
  const setValeur = (cle: string, v: unknown) => {
    setValeurs({ ...valeurs, [cle]: v });
    if (erreurs[cle]) setErreurs({ ...erreurs, [cle]: "" });
  };

  /** Enregistre toutes les réponses de l'étape. terminer=true : l'étape doit être complète. */
  async function enregistrer(terminer: boolean): Promise<boolean> {
    const donnees: Valeurs = {};
    for (const cle of clesEtape(etape)) if (cle in valeurs!) donnees[cle] = valeurs![cle];
    if (Array.isArray(donnees.experiences)) {
      donnees.experiences = (donnees.experiences as ExperienceSaisie[]).filter((e) => e.employeur.trim() || e.poste.trim());
    }
    try {
      const r = await api<ReponseDossier>(`/candidat/dossier/etapes/${etape}`, { methode: "PUT", corps: { donnees, terminer } });
      setReponse(r);
      setHorsLigne(false);
      return true;
    } catch (e) {
      if (e instanceof ErreurClient && e.statut === 0) {
        setHorsLigne(true);
        return false;
      }
      if (e instanceof ErreurClient && e.details) {
        setErreurs(e.details);
        // On revient à l'écran qui contient la première réponse manquante.
        const cible = ecrans.findIndex((x) => x.champs.some((c) => e.details![c.cle]));
        if (cible >= 0) setIndex(cible);
      }
      toaster.create({ type: "error", title: messageErreur(e) });
      return false;
    }
  }

  async function continuer() {
    setEnvoi(true);
    const ok = await enregistrer(dernier);
    setEnvoi(false);
    if (!ok) return;
    if (!dernier) {
      setIndex(index + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    if (etape === "DIPLOME" && valeurs!.aDiplome === false) toaster.create({ type: "info", title: "Pas de souci, ton expérience compte." });
    router.push(adresseEtape(etapeSuivante(etape)));
  }

  async function quitter() {
    setEnvoi(true);
    const ok = await enregistrer(false);
    setEnvoi(false);
    if (ok) router.push("/candidat");
  }

  return (
    <Stack gap="5">
      <HStack justify="space-between">
        <Button variant="ghost" size="sm" onClick={() => (index > 0 ? setIndex(index - 1) : router.push("/candidat"))}>
          <LuArrowLeft /> Retour
        </Button>
        <Text fontSize="sm" color="gris">
          {LIBELLES_ETAPES[etape]} · {Math.min(index, ecrans.length - 1) + 1}/{ecrans.length}
        </Text>
      </HStack>
      <Progress.Root value={((Math.min(index, ecrans.length - 1) + 1) / ecrans.length) * 100} size="xs">
        <Progress.Track bg="brume" borderRadius="full">
          <Progress.Range bg="emeraude.600" />
        </Progress.Track>
      </Progress.Root>

      <Carte>
        <Stack gap="6">
          <Stack gap="1">
            <Heading as="h1" size="xl" color="nuit">
              {ecran.titre}
            </Heading>
            {ecran.aide && <Text color="gris">{ecran.aide}</Text>}
          </Stack>
          {ecran.champs
            .filter((c) => !c.visible || c.visible(valeurs))
            .map((c) => (
              <ChampFormulaire key={c.cle} champ={c} valeurs={valeurs} setValeur={setValeur} erreur={erreurs[c.cle] || undefined} listes={listes} dossier={reponse.dossier} />
            ))}
          {etape === "DIPLOME" && valeurs.aDiplome === false && (
            <Box bg="menthe" color="nuit" borderRadius="carte" p="4" fontWeight="600">
              Pas de souci, ton expérience compte.
            </Box>
          )}
        </Stack>
      </Carte>

      {horsLigne && (
        <Alert.Root status="warning" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Title>Pas de connexion. Tes réponses sont gardées sur cet écran : réessaie dès que le réseau revient.</Alert.Title>
        </Alert.Root>
      )}

      <Button size="lg" colorPalette="emeraude" onClick={continuer} loading={envoi}>
        {dernier ? "Valider cette étape" : "Continuer"}
      </Button>
      <Button variant="plain" color="gris" onClick={quitter} disabled={envoi}>
        Enregistrer et finir plus tard
      </Button>
      <Text fontSize="sm" color="gris" textAlign="center">
        <Link href="/candidat">Voir toutes les étapes</Link>
      </Text>
    </Stack>
  );
}
