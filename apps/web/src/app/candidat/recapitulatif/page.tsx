"use client";

import {
  LIBELLES_BUREAUTIQUE,
  LIBELLES_ENFANTS,
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
import { useTraduction } from "@/components/candidat/traductions";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import { adresseEtape, useDossier } from "@/lib/dossier";
import { useLibelles } from "@/lib/libelles";
import { formatDate, useLangue, type Langue } from "@/lib/preferences";
import type { Dossier, EtapeId, ReponseDossier } from "@/lib/types";

const ouiNon = (v: boolean | null) => (v === null ? null : v ? "Oui" : "Non");
/** Réponses facultatives : vides, elles ne sont pas signalées « À compléter ». */
const FACULTATIFS = new Set(["Filière", "E-mail", "Compétences"]);
const lib = <T extends string>(libelles: Record<T, string>, v: string | null) => (v ? (libelles[v as T] ?? v) : null);

/** Lignes affichées pour chaque section du récapitulatif. */
function lignes(d: Dossier, langue: Langue): Record<Exclude<EtapeId, "JUSTIFICATIFS">, [string, string | null][]> {
  const conjoint = d.situation === "MARIE" || d.situation === "UNION_LIBRE";
  const date = (v: string | null) => (v ? formatDate(`${v.slice(0, 10)}T00:00:00`, langue, { day: "2-digit", month: "2-digit", year: "numeric" }) : null);
  const en = langue === "en";
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
      ["Passeport", d.aPasseport ? `${en ? "Yes, expires on" : "Oui, expire le"} ${date(d.passeportExpiration) ?? "?"}` : ouiNon(d.aPasseport)],
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
          ["Employeurs", d.experiences.map((e) => `${e.poste} ${en ? "at" : "chez"} ${e.employeur}`).join(" ; ") || null],
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
  const { tr, langue } = useLangue();
  const t = useTraduction();
  const l = useLibelles();

  if (!reponse) return <Spinner color="emeraude.600" />;
  const { dossier, etapes, pretAEnvoyer, pieces } = reponse;
  const envoye = dossier.statut === "ENVOYE";
  const sections = lignes(dossier, langue);
  const manquantes = pieces.requises.filter((p) => p.manquante);

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      setReponse(await api<ReponseDossier>("/candidat/dossier/envoyer", { methode: "POST", corps: { certifie: true } }));
      toaster.create({ type: "success", title: tr("Ton dossier est envoyé !", "Your file has been sent!") });
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
        <Heading as="h1" size="2xl" color="titre">
          {tr("Récapitulatif", "Summary")}
        </Heading>
        <Text color="gris">{tr("Vérifie tes réponses. Tu peux modifier chaque partie.", "Check your answers. You can edit each part.")}</Text>
      </Stack>

      {envoye && (
        <Alert.Root status="success" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {tr("Dossier envoyé le", "File sent on")} {formatDate(dossier.envoyeLe!, langue)}
            </Alert.Title>
            <Alert.Description>{tr("Le cabinet va le vérifier. Tu peux encore le modifier et déposer tes pièces.", "The agency will review it. You can still edit it and upload your documents.")}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {(Object.keys(sections) as (keyof typeof sections)[]).map((etape) => (
        <Carte key={etape}>
          <HStack justify="space-between" mb="3" gap="2">
            <Text fontWeight="700" color="titre">
              {l.etape(etape)}
            </Text>
            <HStack gap="2">
              <Text as="span" fontSize="xs" fontWeight="600" color="gris">
                {l.etatEtape(etapes.find((e) => e.etape === etape)!.etat)}
              </Text>
              <Button asChild size="xs" variant="outline">
                <Link href={adresseEtape(etape)}>
                  <LuPencil /> {tr("Modifier", "Edit")}
                </Link>
              </Button>
            </HStack>
          </HStack>
          <Stack gap="2">
            {sections[etape].map(([libelle, valeur]) => (
              <HStack key={libelle} justify="space-between" align="flex-start" gap="4" fontSize="sm">
                <Text color="gris" flexShrink={0}>
                  {t(libelle)}
                </Text>
                <Text color={valeur || FACULTATIFS.has(libelle) ? "encre" : "orange.500"} textAlign="right">
                  {valeur ? t(valeur) : FACULTATIFS.has(libelle) ? "—" : tr("À compléter", "To complete")}
                </Text>
              </HStack>
            ))}
          </Stack>
        </Carte>
      ))}

      <Carte>
        <HStack justify="space-between" mb="3">
          <Text fontWeight="700" color="titre">
            {tr("Justificatifs", "Supporting documents")}
          </Text>
          <Button asChild size="xs" variant="outline">
            <Link href="/candidat/justificatifs">
              <LuPencil /> {tr("Modifier", "Edit")}
            </Link>
          </Button>
        </HStack>
        {manquantes.length === 0 ? (
          <Text fontSize="sm">{tr("Toutes les pièces demandées sont déposées.", "All required documents have been uploaded.")}</Text>
        ) : (
          <Box fontSize="sm">
            <Text mb="1">
              {tr("Pièces manquantes (tu pourras les déposer plus tard ; ton grade restera provisoire) :", "Missing documents (you can upload them later; your grade will remain provisional):")}
            </Text>
            <Stack as="ul" pl="5" gap="1" listStyleType="disc">
              {manquantes.map((p) => (
                <li key={p.type}>{l.piece(p.type as TypePiece)}</li>
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
                <Alert.Title>{tr("Termine toutes les étapes (sauf les justificatifs) pour pouvoir envoyer ton dossier.", "Complete all steps (except documents) to be able to send your file.")}</Alert.Title>
              </Alert.Root>
            )}
            <Checkbox.Root colorPalette="emeraude" checked={certifie} onCheckedChange={(e) => setCertifie(!!e.checked)} alignItems="flex-start">
              <Checkbox.HiddenInput />
              <Checkbox.Control mt="1" bg="surface" />
              <Checkbox.Label fontWeight="400">{tr("Je certifie l'exactitude de mes informations.", "I certify that my information is accurate.")}</Checkbox.Label>
            </Checkbox.Root>
            {erreur && (
              <Text color="etat.refuseTexte" fontSize="sm">
                {erreur}
              </Text>
            )}
            <Button size="lg" colorPalette="emeraude" disabled={!certifie || !pretAEnvoyer} loading={envoi} onClick={envoyer}>
              {tr("Envoyer mon dossier", "Send my file")}
            </Button>
          </Stack>
        </Carte>
      )}

      <Button asChild variant="plain" color="gris">
        <Link href="/candidat">{tr("Retour à mon dossier", "Back to my file")}</Link>
      </Button>
    </Stack>
  );
}
