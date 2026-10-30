"use client";

import {
  LIBELLES_BUREAUTIQUE,
  LIBELLES_ENFANTS,
  LIBELLES_ETAPES,
  LIBELLES_PIECES,
  LIBELLES_SEXES,
  LIBELLES_SITUATIONS,
  LIBELLES_TRANCHES,
  type TypePiece,
} from "@bdt/shared";
import { Alert, Box, Button, Checkbox, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useState } from "react";
import { LuPencil } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { BadgeEtatEtape } from "@/components/candidat/etat-etape";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import { adresseEtape, useDossier } from "@/lib/dossier";
import type { Dossier, EtapeId, ReponseDossier } from "@/lib/types";

const ouiNon = (v: boolean | null) => (v === null ? null : v ? "Oui" : "Non");
const date = (v: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString("fr-FR") : null);
/** Réponses facultatives : vides, elles ne sont pas signalées « À compléter ». */
const FACULTATIFS = new Set(["Filière", "E-mail", "Compétences"]);
const lib = <T extends string>(libelles: Record<T, string>, v: string | null) => (v ? (libelles[v as T] ?? v) : null);

/** Lignes affichées pour chaque section du récapitulatif. */
function lignes(d: Dossier): Record<Exclude<EtapeId, "JUSTIFICATIFS">, [string, string | null][]> {
  const conjoint = d.situation === "MARIE" || d.situation === "UNION_LIBRE";
  return {
    PERSONNEL: [
      ["Nom", [d.prenoms, d.nom].filter(Boolean).join(" ") || null],
      ["Date de naissance", date(d.dateNaissance)],
      ["Sexe", lib(LIBELLES_SEXES, d.sexe)],
      ["Nationalité", d.nationalite],
      ["Ville", d.ville],
      ["Téléphone", d.telephoneContact],
      ["E-mail", d.emailContact],
      ["Langues parlées", d.languesParlees.join(", ") || null],
      ["Passeport", d.aPasseport ? `Oui, expire le ${date(d.passeportExpiration) ?? "?"}` : ouiNon(d.aPasseport)],
    ],
    DIPLOME: d.aDiplome
      ? [
          ["Niveau", d.diplome],
          ["Diplôme", d.diplomeIntitule],
          ["Filière", d.filiere],
          ["Établissement", d.etablissement],
          ["Année", d.diplomeAnnee ? String(d.diplomeAnnee) : null],
          ["Pays", d.diplomePays],
        ]
      : [["Diplôme", ouiNon(d.aDiplome)]],
    LANGUES: d.aTestLangue
      ? [
          ["Test", d.testLangue],
          ["Score", d.testScore === null ? null : String(d.testScore)],
          ["Date", date(d.testDate)],
        ]
      : [["Test de langue", ouiNon(d.aTestLangue)]],
    TRAVAIL: d.aTravaille
      ? [
          ["Domaine", d.domaine],
          ["Métier", d.metier],
          ["Expérience", lib(LIBELLES_TRANCHES, d.trancheExperience)],
          ["Employeurs", d.experiences.map((e) => `${e.poste} chez ${e.employeur}`).join(" ; ") || null],
          ["Compétences", d.competences.map((c) => c.nom).join(", ") || null],
          ["Bureautique", lib(LIBELLES_BUREAUTIQUE, d.bureautique)],
        ]
      : [["A déjà travaillé", ouiNon(d.aTravaille)]],
    FAMILLE: [
      ["Situation", lib(LIBELLES_SITUATIONS, d.situation)],
      ...(conjoint
        ? ([
            ["Conjoint", [d.conjointNom, d.conjointProfession].filter(Boolean).join(", ") || null],
            ["Passeport du conjoint", ouiNon(d.conjointPasseport)],
          ] as [string, string | null][])
        : []),
      ["Enfants", lib(LIBELLES_ENFANTS, d.enfants)],
      ["Personnes qui partiraient avec toi", d.partAvecAccompagnants ? String(d.nombreAccompagnants ?? "?") : ouiNon(d.partAvecAccompagnants)],
    ],
  };
}

export default function Recapitulatif() {
  const { reponse, setReponse } = useDossier();
  const [certifie, setCertifie] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!reponse) return <Spinner color="emeraude.600" />;
  const { dossier, etapes, pretAEnvoyer, pieces } = reponse;
  const envoye = dossier.statut === "ENVOYE";
  const sections = lignes(dossier);
  const manquantes = pieces.requises.filter((p) => p.manquante);

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      setReponse(await api<ReponseDossier>("/candidat/dossier/envoyer", { methode: "POST", corps: { certifie: true } }));
      toaster.create({ type: "success", title: "Ton dossier est envoyé !" });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErreur(e instanceof ErreurClient ? e.message : messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          Récapitulatif
        </Heading>
        <Text color="gris">Vérifie tes réponses. Tu peux modifier chaque partie.</Text>
      </Stack>

      {envoye && (
        <Alert.Root status="success" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dossier envoyé le {new Date(dossier.envoyeLe!).toLocaleDateString("fr-FR")}</Alert.Title>
            <Alert.Description>Le cabinet va le vérifier. Tu peux encore le modifier et déposer tes pièces.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {(Object.keys(sections) as (keyof typeof sections)[]).map((etape) => (
        <Carte key={etape}>
          <HStack justify="space-between" mb="3" gap="2">
            <Text fontWeight="700" color="nuit">
              {LIBELLES_ETAPES[etape]}
            </Text>
            <HStack gap="2">
              <BadgeEtatEtape etat={etapes.find((e) => e.etape === etape)!.etat} />
              <Button asChild size="xs" variant="outline">
                <Link href={adresseEtape(etape)}>
                  <LuPencil /> Modifier
                </Link>
              </Button>
            </HStack>
          </HStack>
          <Stack gap="2">
            {sections[etape].map(([libelle, valeur]) => (
              <HStack key={libelle} justify="space-between" align="flex-start" gap="4" fontSize="sm">
                <Text color="gris" flexShrink={0}>
                  {libelle}
                </Text>
                <Text color={valeur || FACULTATIFS.has(libelle) ? "encre" : "orange.600"} textAlign="right">
                  {valeur ?? (FACULTATIFS.has(libelle) ? "—" : "À compléter")}
                </Text>
              </HStack>
            ))}
          </Stack>
        </Carte>
      ))}

      <Carte>
        <HStack justify="space-between" mb="3">
          <Text fontWeight="700" color="nuit">
            Justificatifs
          </Text>
          <Button asChild size="xs" variant="outline">
            <Link href="/candidat/justificatifs">
              <LuPencil /> Modifier
            </Link>
          </Button>
        </HStack>
        {manquantes.length === 0 ? (
          <Text fontSize="sm">Toutes les pièces demandées sont déposées.</Text>
        ) : (
          <Box fontSize="sm">
            <Text mb="1">Pièces manquantes (tu pourras les déposer plus tard ; ton grade restera provisoire) :</Text>
            <Stack as="ul" pl="5" gap="1" listStyleType="disc">
              {manquantes.map((p) => (
                <li key={p.type}>{LIBELLES_PIECES[p.type as TypePiece]}</li>
              ))}
            </Stack>
          </Box>
        )}
      </Carte>

      {!envoye && (
        <Carte bg="brume" boxShadow="none">
          <Stack gap="4">
            {!pretAEnvoyer && (
              <Alert.Root status="warning" borderRadius="carte">
                <Alert.Indicator />
                <Alert.Title>Termine toutes les étapes (sauf les justificatifs) pour pouvoir envoyer ton dossier.</Alert.Title>
              </Alert.Root>
            )}
            <Checkbox.Root colorPalette="emeraude" checked={certifie} onCheckedChange={(e) => setCertifie(!!e.checked)} alignItems="flex-start">
              <Checkbox.HiddenInput />
              <Checkbox.Control mt="1" bg="white" />
              <Checkbox.Label fontWeight="400">Je certifie l&apos;exactitude de mes informations.</Checkbox.Label>
            </Checkbox.Root>
            {erreur && (
              <Text color="etat.refuseTexte" fontSize="sm">
                {erreur}
              </Text>
            )}
            <Button size="lg" colorPalette="emeraude" disabled={!certifie || !pretAEnvoyer} loading={envoi} onClick={envoyer}>
              Envoyer mon dossier
            </Button>
          </Stack>
        </Carte>
      )}

      <Button asChild variant="plain" color="gris">
        <Link href="/candidat">Retour à mon dossier</Link>
      </Button>
    </Stack>
  );
}
