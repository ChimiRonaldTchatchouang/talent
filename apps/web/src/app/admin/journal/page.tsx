"use client";

import { Button, HStack, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { libelleAction } from "@/lib/actions-journal";
import { api, messageErreur } from "@/lib/api";

interface Entree {
  id: string;
  acteur: string | null;
  role: string | null;
  action: string;
  cibleType: string | null;
  cibleId: string | null;
  creeLe: string;
}

const ROLES: Record<string, string> = { ADMIN: "Administrateur", CANDIDAT: "Candidat", RECRUTEUR: "Recruteur" };

/** Journal des actions (M11) : lecture seule, rien ne peut y être modifié ni supprimé. */
export default function Journal() {
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState<{ total: number; entrees: Entree[] } | null>(null);
  useEffect(() => {
    setDonnees(null);
    api<{ total: number; entrees: Entree[] }>(`/admin/journal?page=${page}`).then(setDonnees).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, [page]);
  const pages = donnees ? Math.max(1, Math.ceil(donnees.total / 50)) : 1;

  return (
    <Stack gap="5">
      <EnTete titre="Journal des actions" sousTitre="Qui a vu, modifié, vérifié ou exporté quoi, et quand. Ce journal ne peut être ni modifié ni supprimé." />
      <Carte p="0" overflow="hidden">
        {!donnees ? (
          <Spinner m="6" color="emeraude.600" />
        ) : (
          <Table.ScrollArea>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="brume">
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Qui</Table.ColumnHeader>
                  <Table.ColumnHeader>Action</Table.ColumnHeader>
                  <Table.ColumnHeader>Sur</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {donnees.entrees.map((e) => (
                  <Table.Row key={e.id}>
                    <Table.Cell fontSize="sm" whiteSpace="nowrap">
                      {new Date(e.creeLe).toLocaleString("fr-FR")}
                    </Table.Cell>
                    <Table.Cell fontSize="sm">
                      {e.acteur ?? "Système"}
                      {e.role && (
                        <Text as="span" color="gris">
                          {" "}
                          · {ROLES[e.role] ?? e.role}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell fontSize="sm">{libelleAction(e.action)}</Table.Cell>
                    <Table.Cell fontSize="xs" color="gris">
                      {e.cibleType ? `${e.cibleType.replace(/_/g, " ")} ${e.cibleId ? `· ${e.cibleId.slice(0, 8)}` : ""}` : "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
      </Carte>
      <HStack justify="center" gap="3">
        <Button size="sm" variant="outline" bg="white" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Plus récents
        </Button>
        <Text fontSize="sm" color="gris">
          Page {page} / {pages}
        </Text>
        <Button size="sm" variant="outline" bg="white" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Plus anciens
        </Button>
      </HStack>
    </Stack>
  );
}
