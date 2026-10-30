"use client";

import { LIBELLES_GRADES } from "@bdt/shared";
import { Alert, Box, Button, Grid, Heading, HStack, Spinner, Stack, Text, Textarea } from "@chakra-ui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { Badges } from "@/components/recruteur/carte-profil";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { ProfilAnonyme } from "@/lib/types";

export default function FicheProfil() {
  const { id } = useParams<{ id: string }>();
  const [fiche, setFiche] = useState<{ profil: ProfilAnonyme; dansSelection: boolean; commentaire: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api<{ profil: ProfilAnonyme; dansSelection: boolean; commentaire: string }>(`/recruteur/profils/${id}`)
      .then((f) => {
        setFiche(f);
        setCommentaire(f.commentaire);
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, [id]);

  async function enregistrer(retirer = false) {
    setEnvoi(true);
    try {
      await api(`/recruteur/selection/profils/${id}`, retirer ? { methode: "DELETE" } : { methode: "PUT", corps: { commentaire } });
      setFiche((f) => f && { ...f, dansSelection: !retirer });
      toaster.create({ type: "success", title: retirer ? "Profil retiré de votre sélection." : "Profil enregistré dans votre sélection." });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur) {
    return (
      <Stack gap="4">
        <Alert.Root status="warning" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Title>{erreur}</Alert.Title>
        </Alert.Root>
        <Button asChild variant="outline" alignSelf="flex-start">
          <Link href="/recruteur">Retour aux profils</Link>
        </Button>
      </Stack>
    );
  }
  if (!fiche) return <Spinner color="emeraude.600" />;
  const p = fiche.profil;
  const lignes: [string, string][] = [
    ["Métier", p.metier ?? "—"],
    ["Domaine", p.domaine ?? "—"],
    ["Expérience", p.experience ?? "—"],
    ["Diplôme", p.niveauDiplome ?? "Aucun déclaré"],
    ["Langues parlées", p.langues.join(", ") || "—"],
    ["Test de langue", p.testLangue ? `${p.testLangue.nom}${p.testLangue.score !== null ? ` · score ${p.testLangue.score}` : ""}` : "Aucun"],
  ];

  return (
    <Stack gap="5">
      <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
        <Link href="/recruteur">
          <LuArrowLeft /> Retour aux profils
        </Link>
      </Button>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 360px" }} gap="5" alignItems="start">
        <Carte>
          <HStack gap="4" mb="5">
            {p.grade && <PastilleGrade grade={p.grade} taille="lg" />}
            <Box>
              <Heading as="h1" size="xl" color="nuit">
                {p.nom}
              </Heading>
              {p.grade && <Text color="gris">Grade {p.grade === "HORS_BASSIN" ? "hors bassin" : p.grade} · {LIBELLES_GRADES[p.grade].libelle}</Text>}
            </Box>
          </HStack>
          <Stack gap="2" mb="5">
            {lignes.map(([l, v]) => (
              <HStack key={l} justify="space-between" gap="4" fontSize="sm" borderBottomWidth="1px" borderColor="brume" pb="2">
                <Text color="gris">{l}</Text>
                <Text textAlign="right">{v}</Text>
              </HStack>
            ))}
          </Stack>
          {p.competences.length > 0 && (
            <Box mb="5">
              <Text fontWeight="600" mb="2">
                Compétences
              </Text>
              <HStack gap="1" wrap="wrap">
                {p.competences.map((c) => (
                  <Box key={c} bg="brume" borderRadius="full" px="3" py="1" fontSize="sm">
                    {c}
                  </Box>
                ))}
              </HStack>
            </Box>
          )}
          <Badges p={p} />
        </Carte>
        <Carte>
          <Text fontWeight="700" color="nuit" mb="3">
            Ma sélection
          </Text>
          <Textarea bg="brume" size="sm" mb="3" placeholder="Votre commentaire sur ce profil (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          <Stack gap="2">
            <Button colorPalette="emeraude" loading={envoi} onClick={() => enregistrer()}>
              {fiche.dansSelection ? "Enregistrer le commentaire" : "Ajouter à ma sélection"}
            </Button>
            {fiche.dansSelection && (
              <Button variant="outline" loading={envoi} onClick={() => enregistrer(true)}>
                Retirer de ma sélection
              </Button>
            )}
          </Stack>
          <Text fontSize="xs" color="gris" mt="3">
            Les coordonnées du candidat ne sont jamais affichées. Le cabinet organise la mise en relation après l&apos;envoi de votre sélection.
          </Text>
        </Carte>
      </Grid>
    </Stack>
  );
}
