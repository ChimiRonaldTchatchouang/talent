"use client";

import { LIBELLES_ETATS_SERVICE } from "@bdt/shared";
import { Box, Button, HStack, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { ResumeCandidat } from "@/lib/types";

interface Demande {
  dossierId: string;
  candidat: string;
  telephone: string | null;
  grade: ResumeCandidat["grade"];
  serviceId: string;
  service: string;
  etat: "INTERESSE" | "ACCEPTE" | "EN_COURS" | "REALISE" | "ANNULE";
  modifieLe: string;
}
const SUIVANT: Partial<Record<Demande["etat"], "ACCEPTE" | "EN_COURS" | "REALISE">> = { INTERESSE: "ACCEPTE", ACCEPTE: "EN_COURS", EN_COURS: "REALISE" };
const FILTRES = [
  { v: "", l: "En cours de traitement" },
  { v: "INTERESSE", l: "Intéressés" },
  { v: "REALISE", l: "Réalisés" },
  { v: "ANNULE", l: "Annulés" },
];

export default function SuiviServices() {
  const [filtre, setFiltre] = useState("");
  const [demandes, setDemandes] = useState<Demande[] | null>(null);
  const charger = useCallback(() => {
    api<{ demandes: Demande[] }>(`/admin/services-demandes${filtre ? `?etat=${filtre}` : ""}`)
      .then((r) => setDemandes(r.demandes))
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, [filtre]);
  useEffect(charger, [charger]);

  async function avancer(d: Demande, etat: string) {
    try {
      await api(`/admin/dossiers/${d.dossierId}/services/${d.serviceId}`, { methode: "PUT", corps: { etat } });
      toaster.create({ type: "success", title: `${d.service} : ${LIBELLES_ETATS_SERVICE[etat as Demande["etat"]]}.` });
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  return (
    <Stack gap="5">
      <EnTete
        titre="Suivi des services"
        sousTitre="Faites avancer chaque demande. Un service réalisé met à jour le grade du candidat."
        actions={FILTRES.map((f) => (
          <Button key={f.v} size="sm" variant={filtre === f.v ? "solid" : "outline"} bg={filtre === f.v ? undefined : "white"} colorPalette="emeraude" onClick={() => setFiltre(f.v)}>
            {f.l}
          </Button>
        ))}
      />
      {!demandes && <Spinner color="emeraude.600" />}
      {demandes && demandes.length === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris">Aucune demande pour le moment.</Text>
        </Carte>
      )}
      {demandes && demandes.length > 0 && (
        <Carte p="0" overflow="hidden">
          <Table.ScrollArea>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="brume">
                  <Table.ColumnHeader>Candidat</Table.ColumnHeader>
                  <Table.ColumnHeader>Service</Table.ColumnHeader>
                  <Table.ColumnHeader>État</Table.ColumnHeader>
                  <Table.ColumnHeader>Depuis</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {demandes.map((d) => {
                  const suivant = SUIVANT[d.etat];
                  return (
                    <Table.Row key={`${d.dossierId}-${d.serviceId}`}>
                      <Table.Cell>
                        <HStack gap="2">
                          {d.grade && <PastilleGrade grade={d.grade} taille="sm" />}
                          <Box>
                            <Link href={`/admin/candidats/${d.dossierId}`}>
                              <Text fontWeight="600" color="nuit">
                                {d.candidat}
                              </Text>
                            </Link>
                            <Text fontSize="xs" color="gris">
                              {d.telephone}
                            </Text>
                          </Box>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell>{d.service}</Table.Cell>
                      <Table.Cell>{LIBELLES_ETATS_SERVICE[d.etat]}</Table.Cell>
                      <Table.Cell fontSize="sm">{new Date(d.modifieLe).toLocaleDateString("fr-FR")}</Table.Cell>
                      <Table.Cell>
                        <HStack justify="flex-end" gap="1">
                          {suivant && (
                            <Button size="xs" colorPalette="emeraude" onClick={() => avancer(d, suivant)}>
                              Passer à « {LIBELLES_ETATS_SERVICE[suivant]} »
                            </Button>
                          )}
                          {d.etat !== "ANNULE" && d.etat !== "REALISE" && (
                            <Button size="xs" variant="ghost" onClick={() => avancer(d, "ANNULE")}>
                              Annuler
                            </Button>
                          )}
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Carte>
      )}
    </Stack>
  );
}
