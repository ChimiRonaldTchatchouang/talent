"use client";

import { GRADES } from "@bdt/shared";
import { Alert, Badge, Box, Button, Field, HStack, Input, SimpleGrid, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeEtat } from "@/components/badges";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import type { Domaine } from "@/lib/types";

interface Recruteur {
  id: string;
  nom: string;
  email: string;
  etat: "ACTIF" | "DESACTIVE";
  entreprise: string;
  pays: string;
  gradesVisibles: string[];
  domainesVisibles: string[];
  dateFin: string;
  ouvert: boolean;
  profilsVisibles: number;
  derniereConnexion: string | null;
}

const dansUnMois = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const VIDE = { nom: "", entreprise: "", pays: "", email: "", dateFin: dansUnMois(), gradesVisibles: ["A"] as string[], domainesVisibles: [] as string[] };
const libelleGrade = (g: string) => (g === "HORS_BASSIN" ? "Hors bassin" : g);
const basculer = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export default function Recruteurs() {
  const [recruteurs, setRecruteurs] = useState<Recruteur[] | null>(null);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [f, setF] = useState(VIDE);
  const [apercu, setApercu] = useState<number | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [motDePasse, setMotDePasse] = useState<{ email: string; motDePasse: string } | null>(null);
  const [prolonger, setProlonger] = useState<Record<string, string>>({});

  const charger = useCallback(() => {
    api<{ recruteurs: Recruteur[] }>("/admin/recruteurs")
      .then((r) => setRecruteurs(r.recruteurs))
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  useEffect(() => {
    charger();
    api<{ domaines: Domaine[] }>("/referentiels").then((r) => setDomaines(r.domaines)).catch(() => undefined);
  }, [charger]);

  // Aperçu en direct : « Ce recruteur verra N profils ».
  useEffect(() => {
    if (f.gradesVisibles.length === 0) return setApercu(0);
    api<{ nombre: number }>("/admin/recruteurs/apercu", { methode: "POST", corps: { gradesVisibles: f.gradesVisibles, domainesVisibles: f.domainesVisibles } })
      .then((r) => setApercu(r.nombre))
      .catch(() => setApercu(null));
  }, [f.gradesVisibles, f.domainesVisibles]);

  async function creer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      const r = await api<{ motDePasse: string }>("/admin/recruteurs", { methode: "POST", corps: f });
      setMotDePasse({ email: f.email, motDePasse: r.motDePasse });
      toaster.create({ type: "success", title: "Accès créé. Les identifiants ont été envoyés par e-mail." });
      setF(VIDE);
      charger();
    } catch (err) {
      if (err instanceof ErreurClient && err.details) setErreurs(err.details);
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  async function modifier(r: Recruteur, corps: object, message: string) {
    try {
      await api(`/admin/recruteurs/${r.id}`, { methode: "PATCH", corps });
      toaster.create({ type: "success", title: message });
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function nouveauMotDePasse(r: Recruteur) {
    try {
      const res = await api<{ motDePasse: string }>(`/admin/recruteurs/${r.id}/mot-de-passe`, { methode: "POST" });
      setMotDePasse({ email: r.email, motDePasse: res.motDePasse });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  const champ = (cle: "nom" | "entreprise" | "pays" | "email" | "dateFin", libelle: string, type = "text") => (
    <Field.Root invalid={!!erreurs[cle]}>
      <Field.Label>{libelle}</Field.Label>
      <Input bg="brume" type={type} value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} />
      <Field.ErrorText>{erreurs[cle]}</Field.ErrorText>
    </Field.Root>
  );

  return (
    <Stack gap="6">
      <EnTete titre="Recruteurs" sousTitre="Ouvrez un accès limité et anonymisé à un recruteur, pour une durée définie." />

      {motDePasse && (
        <Alert.Root status="warning" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              Identifiants de {motDePasse.email} : mot de passe provisoire « {motDePasse.motDePasse} »
            </Alert.Title>
            <Alert.Description>Envoyés par e-mail. Ce mot de passe ne sera plus affiché.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <Carte as="form" onSubmit={creer}>
        <Text fontWeight="700" color="nuit" mb="4">
          Nouvel accès recruteur
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="4" mb="4">
          {champ("nom", "Nom du recruteur")}
          {champ("entreprise", "Entreprise")}
          {champ("pays", "Pays")}
          {champ("email", "E-mail", "email")}
          {champ("dateFin", "Date de fin de l'accès (obligatoire)", "date")}
        </SimpleGrid>
        <Stack gap="3" bg="brume" borderRadius="carte" p="4" mb="4">
          <HStack gap="2" wrap="wrap">
            <Text fontSize="sm" fontWeight="600" w="40">
              Grades visibles
            </Text>
            {GRADES.map((g) => (
              <Button key={g} size="xs" borderRadius="full" colorPalette="emeraude" variant={f.gradesVisibles.includes(g) ? "solid" : "outline"} bg={f.gradesVisibles.includes(g) ? undefined : "white"} onClick={() => setF({ ...f, gradesVisibles: basculer(f.gradesVisibles, g) })}>
                {libelleGrade(g)}
              </Button>
            ))}
          </HStack>
          <HStack gap="2" wrap="wrap">
            <Text fontSize="sm" fontWeight="600" w="40">
              Domaines visibles
            </Text>
            <Button size="xs" borderRadius="full" colorPalette="emeraude" variant={f.domainesVisibles.length === 0 ? "solid" : "outline"} bg={f.domainesVisibles.length === 0 ? undefined : "white"} onClick={() => setF({ ...f, domainesVisibles: [] })}>
              Tous
            </Button>
            {domaines.map((d) => (
              <Button key={d.id} size="xs" borderRadius="full" colorPalette="emeraude" variant={f.domainesVisibles.includes(d.id) ? "solid" : "outline"} bg={f.domainesVisibles.includes(d.id) ? undefined : "white"} onClick={() => setF({ ...f, domainesVisibles: basculer(f.domainesVisibles, d.id) })}>
                {d.nom}
              </Button>
            ))}
          </HStack>
          <Text fontWeight="700" color="nuit">
            {apercu === null ? "…" : `Ce recruteur verra ${apercu} profil${apercu > 1 ? "s" : ""}.`}
          </Text>
          <Text fontSize="xs" color="gris">
            Seuls les dossiers envoyés, au grade confirmé, dont le candidat a accepté d&apos;être présenté. Jamais de coordonnées ni de documents.
          </Text>
        </Stack>
        <Button type="submit" colorPalette="emeraude" loading={envoi} disabled={f.gradesVisibles.length === 0}>
          Créer l&apos;accès et envoyer les identifiants
        </Button>
      </Carte>

      <Carte p="0" overflow="hidden">
        {!recruteurs && <Spinner m="6" color="emeraude.600" />}
        {recruteurs && recruteurs.length === 0 && (
          <Text p="6" color="gris">
            Aucun accès recruteur pour le moment.
          </Text>
        )}
        {recruteurs && recruteurs.length > 0 && (
          <Table.ScrollArea>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="brume">
                  <Table.ColumnHeader>Recruteur</Table.ColumnHeader>
                  <Table.ColumnHeader>Périmètre</Table.ColumnHeader>
                  <Table.ColumnHeader>Fin de l&apos;accès</Table.ColumnHeader>
                  <Table.ColumnHeader>État</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {recruteurs.map((r) => (
                  <Table.Row key={r.id}>
                    <Table.Cell>
                      <Text fontWeight="600">{r.nom}</Text>
                      <Text fontSize="xs" color="gris">
                        {r.entreprise} · {r.pays} · {r.email}
                      </Text>
                    </Table.Cell>
                    <Table.Cell fontSize="sm">
                      Grades {r.gradesVisibles.map(libelleGrade).join(", ")} ·{" "}
                      {r.domainesVisibles.length ? domaines.filter((d) => r.domainesVisibles.includes(d.id)).map((d) => d.nom).join(", ") : "tous domaines"}
                      <Text fontSize="xs" color="gris">
                        {r.profilsVisibles} profil(s) visible(s)
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap="1">
                        <Input size="xs" type="date" w="36" value={prolonger[r.id] ?? r.dateFin} onChange={(e) => setProlonger({ ...prolonger, [r.id]: e.target.value })} />
                        {prolonger[r.id] && prolonger[r.id] !== r.dateFin && (
                          <Button size="xs" colorPalette="emeraude" onClick={() => modifier(r, { dateFin: prolonger[r.id] }, "Date de fin modifiée.")}>
                            OK
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>
                      {r.ouvert ? <BadgeEtat etat="ACTIF" /> : r.etat === "DESACTIVE" ? <BadgeEtat etat="DESACTIVE" /> : <Badge bg="etat.refuse" color="etat.refuseTexte" borderRadius="full">Expiré</Badge>}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack justify="flex-end" gap="1">
                        <Button size="xs" variant="ghost" onClick={() => nouveauMotDePasse(r)}>
                          Nouveau mot de passe
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => modifier(r, { etat: r.etat === "ACTIF" ? "DESACTIVE" : "ACTIF" }, r.etat === "ACTIF" ? "Accès désactivé." : "Accès réactivé.")}>
                          {r.etat === "ACTIF" ? "Désactiver" : "Réactiver"}
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
      </Carte>
      <Box />
    </Stack>
  );
}
