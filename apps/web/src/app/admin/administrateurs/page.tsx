"use client";

import { Alert, Button, Field, Heading, Input, SimpleGrid, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeEtat } from "@/components/badges";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Administrateur } from "@/lib/types";

const VIDE = { nom: "", email: "", motDePasse: "" };

export default function PageAdministrateurs() {
  const moi = useSession("ADMIN");
  const [admins, setAdmins] = useState<Administrateur[] | null>(null);
  const [formulaire, setFormulaire] = useState(VIDE);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    api<{ administrateurs: Administrateur[] }>("/admin/administrateurs")
      .then((r) => setAdmins(r.administrateurs))
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  useEffect(charger, [charger]);

  async function creer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      await api("/admin/administrateurs", { methode: "POST", corps: formulaire });
      toaster.create({ type: "success", title: "Compte administrateur créé." });
      setFormulaire(VIDE);
      charger();
    } catch (err) {
      if (err instanceof ErreurClient && err.details) setErreurs(err.details);
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  async function changerEtat(a: Administrateur) {
    try {
      await api(`/admin/administrateurs/${a.id}`, {
        methode: "PATCH",
        corps: { etat: a.etat === "ACTIF" ? "DESACTIVE" : "ACTIF" },
      });
      toaster.create({ type: "success", title: a.etat === "ACTIF" ? "Compte désactivé." : "Compte réactivé." });
      charger();
    } catch (err) {
      toaster.create({ type: "error", title: messageErreur(err) });
    }
  }

  if (!admins || !moi) return <Spinner color="emeraude.600" />;

  return (
    <Stack gap="6">
      <Heading as="h1" size="2xl" color="nuit">
        Administrateurs
      </Heading>

      {moi.estPrincipal ? (
        <Carte as="form" onSubmit={creer}>
          <Heading as="h2" size="md" color="nuit" mb="4">
            Créer un compte administrateur
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="4" mb="4">
            {(
              [
                ["nom", "Nom complet", "text", "name"],
                ["email", "E-mail", "email", "off"],
                ["motDePasse", "Mot de passe provisoire (8 caractères minimum)", "password", "new-password"],
              ] as const
            ).map(([cle, libelle, type, auto]) => (
              <Field.Root key={cle} invalid={!!erreurs[cle]}>
                <Field.Label>{libelle}</Field.Label>
                <Input
                  bg="brume"
                  type={type}
                  autoComplete={auto}
                  value={formulaire[cle]}
                  onChange={(e) => setFormulaire({ ...formulaire, [cle]: e.target.value })}
                />
                <Field.ErrorText>{erreurs[cle]}</Field.ErrorText>
              </Field.Root>
            ))}
          </SimpleGrid>
          <Button type="submit" colorPalette="emeraude" loading={envoi}>
            Créer le compte
          </Button>
        </Carte>
      ) : (
        <Alert.Root status="info" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Title>Seul l&apos;administrateur principal peut créer ou désactiver des comptes administrateurs.</Alert.Title>
        </Alert.Root>
      )}

      <Carte>
        <Table.ScrollArea>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Nom</Table.ColumnHeader>
                <Table.ColumnHeader>E-mail</Table.ColumnHeader>
                <Table.ColumnHeader>Dernière connexion</Table.ColumnHeader>
                <Table.ColumnHeader>État</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {admins.map((a) => (
                <Table.Row key={a.id}>
                  <Table.Cell>
                    {a.nom}
                    {a.estPrincipal && (
                      <Text as="span" color="gris" fontSize="sm">
                        {" "}
                        · principal
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>{a.email}</Table.Cell>
                  <Table.Cell>
                    {a.derniereConnexion ? new Date(a.derniereConnexion).toLocaleString("fr-FR") : "Jamais"}
                  </Table.Cell>
                  <Table.Cell>
                    <BadgeEtat etat={a.etat} />
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {moi.estPrincipal && !a.estPrincipal && (
                      <Button size="xs" variant="outline" onClick={() => changerEtat(a)}>
                        {a.etat === "ACTIF" ? "Désactiver" : "Réactiver"}
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </Carte>
    </Stack>
  );
}
