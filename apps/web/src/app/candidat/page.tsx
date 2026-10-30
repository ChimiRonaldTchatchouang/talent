"use client";

import { LIBELLES_ETAPES } from "@bdt/shared";
import { Alert, Box, Button, Heading, HStack, Progress, Spinner, Stack, Switch, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuChevronRight } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { BadgeEtatEtape } from "@/components/candidat/etat-etape";
import { CarteGrade, CarteService } from "@/components/candidat/grade";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { adresseEtape, useDossier } from "@/lib/dossier";
import type { Classement, UtilisateurPublic } from "@/lib/types";

export default function Sommaire() {
  const { reponse, setReponse } = useDossier();
  const [moi, setMoi] = useState<UtilisateurPublic | null>(null);
  const [renvoi, setRenvoi] = useState(false);
  const [classement, setClassement] = useState<Classement | null>(null);

  useEffect(() => {
    api<{ utilisateur: UtilisateurPublic }>("/auth/moi").then((r) => setMoi(r.utilisateur)).catch(() => undefined);
    api<Classement>("/candidat/classement").then(setClassement).catch(() => undefined);
  }, []);

  if (!reponse) return <Spinner color="emeraude.600" />;
  const { dossier, etapes, progression, etapeReprise, pretAEnvoyer } = reponse;
  const envoye = dossier.statut === "ENVOYE";
  const commence = etapes.some((e) => e.etat !== "A_FAIRE");

  async function renvoyerConfirmation() {
    setRenvoi(true);
    try {
      const r = await api<{ message: string }>("/auth/renvoyer-confirmation", { methode: "POST" });
      toaster.create({ type: "success", title: r.message });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setRenvoi(false);
    }
  }

  async function changerConsentement(valeur: boolean) {
    try {
      await api("/candidat/consentements", { methode: "PUT", corps: { recruteurs: valeur } });
      setReponse({ ...reponse!, dossier: { ...dossier, consentementRecruteurs: valeur } });
      toaster.create({ type: "success", title: valeur ? "Ton profil pourra être présenté aux recruteurs." : "Ton profil ne sera plus présenté aux recruteurs." });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          {dossier.prenoms ? `Bonjour ${dossier.prenoms.split(" ")[0]} !` : "Bienvenue !"}
        </Heading>
        <Text color="gris">
          {envoye
            ? `Ton dossier a été envoyé le ${new Date(dossier.envoyeLe!).toLocaleDateString("fr-FR")}. Tu peux encore le modifier.`
            : "Remplis ton dossier étape par étape. Tout est enregistré automatiquement."}
        </Text>
      </Stack>

      {moi?.email && !moi.emailConfirme && (
        <Alert.Root status="info" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Confirme ton adresse e-mail</Alert.Title>
            <Alert.Description>
              Ouvre le lien envoyé à {moi.email}.{" "}
              <Button variant="plain" size="sm" px="0" color="emeraude.600" loading={renvoi} onClick={renvoyerConfirmation}>
                Renvoyer le lien
              </Button>
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {classement?.disponible && (
        <Carte>
          <Stack gap="4">
            <CarteGrade c={classement} />
            {classement.elements.some((e) => !e.acquis) && (
              <Box>
                <Text fontWeight="600" color="nuit" mb="1">
                  Ce qui te manque
                </Text>
                <Stack as="ul" pl="5" gap="1" listStyleType="disc" fontSize="sm" color="gris">
                  {classement.elements
                    .filter((e) => !e.acquis)
                    .map((e) => (
                      <li key={e.element}>{e.raison}</li>
                    ))}
                </Stack>
              </Box>
            )}
            {classement.services
              .filter((x) => x.suggere && x.etat === "SUGGERE")
              .slice(0, 2)
              .map((x) => (
                <CarteService key={x.id} s={x} onChange={setClassement} />
              ))}
            <Button asChild variant="outline" colorPalette="emeraude">
              <Link href="/candidat/grade">Pourquoi ce grade ?</Link>
            </Button>
          </Stack>
        </Carte>
      )}

      <Carte bg="nuit" color="white">
        <HStack justify="space-between" mb="3">
          <Text fontWeight="600">Mon dossier</Text>
          <Text fontWeight="700" color="menthe">
            {progression} %
          </Text>
        </HStack>
        <Progress.Root value={progression} size="md" colorPalette="green">
          <Progress.Track bg="whiteAlpha.300" borderRadius="full">
            <Progress.Range bg="menthe" />
          </Progress.Track>
        </Progress.Root>
        {etapeReprise && (
          <Button asChild mt="5" size="lg" w="full" bg="menthe" color="nuit" _hover={{ bg: "#64e38f" }}>
            <Link href={adresseEtape(etapeReprise)}>{commence ? "Reprendre où je me suis arrêté" : "Commencer mon dossier"}</Link>
          </Button>
        )}
      </Carte>

      <Stack gap="2" as="nav" aria-label="Étapes du dossier">
        {etapes.map(({ etape, etat }, i) => (
          <Link key={etape} href={adresseEtape(etape)}>
            <HStack bg="white" borderRadius="carte" boxShadow="carte" p="4" gap="3" _hover={{ boxShadow: "md" }}>
              <Box w="8" h="8" borderRadius="full" bg={etat === "TERMINE" ? "menthe" : "brume"} color="nuit" display="grid" placeItems="center" fontWeight="700" flexShrink={0}>
                {i + 1}
              </Box>
              <Text flex="1" fontWeight="600" color="nuit">
                {LIBELLES_ETAPES[etape]}
              </Text>
              <BadgeEtatEtape etat={etat} />
              <LuChevronRight color="#56637A" />
            </HStack>
          </Link>
        ))}
      </Stack>

      <Button asChild size="lg" colorPalette="emeraude" variant={pretAEnvoyer && !envoye ? "solid" : "outline"}>
        <Link href="/candidat/recapitulatif">{envoye ? "Voir mon récapitulatif" : "Récapitulatif et envoi"}</Link>
      </Button>

      <Carte>
        <Text fontWeight="600" color="nuit" mb="3">
          Mes accords
        </Text>
        <Switch.Root colorPalette="emeraude" checked={dossier.consentementRecruteurs} onCheckedChange={(e) => changerConsentement(e.checked)} alignItems="flex-start">
          <Switch.HiddenInput />
          <Switch.Control mt="1">
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label fontWeight="400">
            Mon profil peut être présenté à des recruteurs, sans mes coordonnées ni mes documents.
          </Switch.Label>
        </Switch.Root>
      </Carte>
    </Stack>
  );
}
