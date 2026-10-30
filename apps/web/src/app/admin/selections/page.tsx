"use client";

import { LIBELLES_STATUTS_LIGNE, STATUTS_LIGNE_SELECTION } from "@bdt/shared";
import { Box, Button, HStack, NativeSelect, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { ResumeCandidat } from "@/lib/types";

interface Selection {
  id: string;
  recruteur: string;
  email: string;
  entreprise: string;
  pays: string;
  message: string;
  envoyeeLe: string;
  remplaceeLe: string | null;
  lignes: { id: string; dossierId: string; candidat: string; telephone: string | null; metier: string | null; grade: ResumeCandidat["grade"]; commentaire: string; statut: string }[];
}

export default function Selections() {
  const [historique, setHistorique] = useState(false);
  const [selections, setSelections] = useState<Selection[] | null>(null);
  const charger = useCallback(() => {
    api<{ selections: Selection[] }>(`/admin/selections${historique ? "?historique=true" : ""}`)
      .then((r) => setSelections(r.selections))
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, [historique]);
  useEffect(charger, [charger]);

  async function statut(ligneId: string, valeur: string) {
    try {
      await api(`/admin/selections/lignes/${ligneId}`, { methode: "PUT", corps: { statut: valeur } });
      toaster.create({ type: "success", title: "Suivi mis à jour." });
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  return (
    <Stack gap="5">
      <EnTete
        titre="Sélections reçues"
        sousTitre="Les candidats retenus par les recruteurs, avec leurs commentaires."
        actions={
          <Button size="sm" variant="outline" bg="white" onClick={() => setHistorique(!historique)}>
            {historique ? "Masquer les anciennes versions" : "Voir aussi les anciennes versions"}
          </Button>
        }
      />
      {!selections && <Spinner color="emeraude.600" />}
      {selections && selections.length === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris">Aucune sélection reçue pour le moment.</Text>
        </Carte>
      )}
      {selections?.map((s) => (
        <Carte key={s.id} opacity={s.remplaceeLe ? 0.6 : 1}>
          <Stack gap="4">
            <Box>
              <Text fontWeight="700" fontSize="lg" color="nuit">
                {s.entreprise} · {s.pays}
              </Text>
              <Text fontSize="sm" color="gris">
                {s.recruteur} ({s.email}) · envoyée le {new Date(s.envoyeeLe).toLocaleString("fr-FR")}
                {s.remplaceeLe && ` · remplacée le ${new Date(s.remplaceeLe).toLocaleDateString("fr-FR")}`}
              </Text>
            </Box>
            {s.message && (
              <Box bg="brume" borderRadius="carte" p="3" fontSize="sm" whiteSpace="pre-wrap">
                {s.message}
              </Box>
            )}
            <Stack gap="2">
              {s.lignes.map((l) => (
                <HStack key={l.id} justify="space-between" borderWidth="1px" borderColor="brume" borderRadius="carte" p="3" wrap="wrap" gap="3">
                  <HStack gap="3" minW="0">
                    {l.grade && <PastilleGrade grade={l.grade} taille="sm" />}
                    <Box minW="0">
                      <Link href={`/admin/candidats/${l.dossierId}`}>
                        <Text fontWeight="600" color="nuit">
                          {l.candidat}
                        </Text>
                      </Link>
                      <Text fontSize="xs" color="gris">
                        {[l.metier, l.telephone].filter(Boolean).join(" · ")}
                      </Text>
                      {l.commentaire && (
                        <Text fontSize="sm" mt="1">
                          « {l.commentaire} »
                        </Text>
                      )}
                    </Box>
                  </HStack>
                  <NativeSelect.Root size="sm" w="56" disabled={!!s.remplaceeLe}>
                    <NativeSelect.Field bg="brume" value={l.statut} onChange={(e) => statut(l.id, e.target.value)}>
                      {STATUTS_LIGNE_SELECTION.map((x) => (
                        <option key={x} value={x}>
                          {LIBELLES_STATUTS_LIGNE[x]}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </HStack>
              ))}
            </Stack>
          </Stack>
        </Carte>
      ))}
    </Stack>
  );
}
