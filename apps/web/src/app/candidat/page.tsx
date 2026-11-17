"use client";

import { Alert, Box, Button, Heading, HStack, Progress, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowRight, LuChevronRight, LuEye, LuSparkles } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { CarteGrade } from "@/components/candidat/grade";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { adresseEtape, useDossier } from "@/lib/dossier";
import { useLibelles } from "@/lib/libelles";
import { formatDate, useLangue } from "@/lib/preferences";
import type { Classement, EtatEtape, UtilisateurPublic } from "@/lib/types";

const STYLES_ETAPE: Record<EtatEtape, { bg: string; color: string }> = {
  A_FAIRE: { bg: "brume", color: "gris" },
  EN_COURS: { bg: "#FEF3C7", color: "#92400E" },
  TERMINE: { bg: "menthe", color: "nuit" },
  SAUTE: { bg: "transparent", color: "gris" },
};

/** Accueil de l'espace candidat : l'état du profil en un coup d'œil. */
export default function Accueil() {
  const { reponse } = useDossier();
  const { tr, langue } = useLangue();
  const l = useLibelles();
  const [moi, setMoi] = useState<UtilisateurPublic | null>(null);
  const [renvoi, setRenvoi] = useState(false);
  const [classement, setClassement] = useState<Classement | null>(null);
  const [consultations, setConsultations] = useState<{ nombre: number; derniere: string | null } | null>(null);

  useEffect(() => {
    api<{ utilisateur: UtilisateurPublic }>("/auth/moi").then((r) => setMoi(r.utilisateur)).catch(() => undefined);
    api<Classement>("/candidat/classement").then(setClassement).catch(() => undefined);
    api<{ nombre: number; derniere: string | null }>("/candidat/consultations").then(setConsultations).catch(() => undefined);
  }, []);

  if (!reponse) return <Spinner color="emeraude.600" />;
  const { dossier, etapes, progression, etapeReprise, pretAEnvoyer } = reponse;
  const envoye = dossier.statut === "ENVOYE";
  const commence = etapes.some((e) => e.etat !== "A_FAIRE");
  const prenom = dossier.prenoms?.split(" ")[0];
  const manques = classement?.elements.filter((e) => !e.acquis) ?? [];

  async function renvoyerConfirmation() {
    setRenvoi(true);
    try {
      await api<{ message: string }>("/auth/renvoyer-confirmation", { methode: "POST" });
      toaster.create({ type: "success", title: tr("Un nouveau lien t'a été envoyé.", "A new link has been sent to you.") });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setRenvoi(false);
    }
  }

  return (
    <Stack gap="5">
      <Stack gap="1" className="bdt-page">
        <Heading as="h1" size="2xl" color="titre">
          {prenom ? tr(`Bonjour ${prenom} 👋`, `Hello ${prenom} 👋`) : tr("Bienvenue 👋", "Welcome 👋")}
        </Heading>
        <Text color="gris">
          {envoye
            ? tr(`Ton dossier a été envoyé le ${formatDate(dossier.envoyeLe!, langue)}. Tu peux encore le modifier.`, `Your file was sent on ${formatDate(dossier.envoyeLe!, langue)}. You can still edit it.`)
            : tr("Remplis ton dossier étape par étape. Tout est enregistré automatiquement.", "Fill in your file step by step. Everything is saved automatically.")}
        </Text>
      </Stack>

      {moi?.email && !moi.emailConfirme && (
        <Alert.Root status="info" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{tr("Confirme ton adresse e-mail", "Confirm your email address")}</Alert.Title>
            <Alert.Description>
              {tr(`Ouvre le lien envoyé à ${moi.email}.`, `Open the link sent to ${moi.email}.`)}{" "}
              <Button variant="plain" size="sm" px="0" color="accent" loading={renvoi} onClick={renvoyerConfirmation}>
                {tr("Renvoyer le lien", "Resend the link")}
              </Button>
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* État du profil : progression du dossier */}
      <Carte bg="nuit" color="white" position="relative" overflow="hidden">
        <Box position="absolute" right="-10" top="-10" w="40" h="40" borderRadius="full" bg="menthe" opacity="0.12" />
        <HStack justify="space-between" mb="3" position="relative">
          <Text fontWeight="600">{tr("Mon dossier", "My file")}</Text>
          <Text fontWeight="700" color="menthe">
            {progression} %
          </Text>
        </HStack>
        <Progress.Root value={progression} size="md" colorPalette="green" position="relative">
          <Progress.Track bg="whiteAlpha.300" borderRadius="full">
            <Progress.Range bg="menthe" />
          </Progress.Track>
        </Progress.Root>
        <Text fontSize="sm" color="whiteAlpha.800" mt="3" position="relative">
          {envoye ? tr("Dossier envoyé au cabinet.", "File sent to the agency.") : pretAEnvoyer ? tr("Tout est prêt : il ne reste qu'à l'envoyer.", "Everything is ready: you just need to send it.") : tr("Dossier en cours de remplissage.", "File in progress.")}
        </Text>
        {etapeReprise && (
          <Button asChild mt="4" size="lg" w="full" bg="menthe" color="nuit" _hover={{ bg: "#64e38f" }} position="relative">
            <Link href={adresseEtape(etapeReprise)}>{commence ? tr("Reprendre où je me suis arrêté", "Continue where I left off") : tr("Commencer mon dossier", "Start my file")}</Link>
          </Button>
        )}
      </Carte>

      {/* Grade et ce qui manque */}
      {classement?.disponible && (
        <Carte>
          <Stack gap="4">
            <CarteGrade c={classement} />
            {manques.length > 0 && (
              <Box bg="fond" borderRadius="carte" p="4">
                <Text fontWeight="600" color="titre" mb="2">
                  {tr("Ce qui te manque", "What you're missing")}
                </Text>
                <Stack gap="1.5">
                  {manques.map((e) => (
                    <HStack key={e.element} gap="2" fontSize="sm" color="gris" align="flex-start">
                      <Box w="1.5" h="1.5" borderRadius="full" bg="orange.400" mt="2" flexShrink={0} />
                      <Text>
                        <Text as="span" fontWeight="600" color="titre">
                          {l.element(e.element)}
                        </Text>{" "}
                        · {l.raison(e.element, e.etat, e.raison)}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            )}
            <Stack direction={{ base: "column", sm: "row" }} gap="2">
              {classement.grade !== "A" && (
                <Button asChild colorPalette="emeraude" flex={{ sm: "1" }}>
                  <Link href="/candidat/services">
                    <LuSparkles /> {tr("Passer au grade A", "Reach grade A")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" colorPalette="emeraude" flex={{ sm: "1" }}>
                <Link href="/candidat/grade">{tr("Pourquoi ce grade ?", "Why this grade?")}</Link>
              </Button>
            </Stack>
          </Stack>
        </Carte>
      )}

      {/* Étapes du dossier */}
      <Stack gap="2" as="nav" aria-label={tr("Étapes du dossier", "File steps")}>
        <Text fontWeight="700" color="titre">
          {tr("Les étapes de mon dossier", "My file steps")}
        </Text>
        {etapes.map(({ etape, etat }, i) => (
          <Link key={etape} href={adresseEtape(etape)}>
            <HStack className="bdt-cliquable" bg="surface" borderRadius="carte" boxShadow="carte" p="4" gap="3">
              <Box w="8" h="8" borderRadius="full" bg={etat === "TERMINE" ? "menthe" : "brume"} color="nuit" display="grid" placeItems="center" fontWeight="700" flexShrink={0}>
                {i + 1}
              </Box>
              <Text flex="1" fontWeight="600" color="titre">
                {l.etape(etape)}
              </Text>
              <Box as="span" bg={STYLES_ETAPE[etat].bg} color={STYLES_ETAPE[etat].color} borderRadius="full" px="3" py="1" fontSize="xs" fontWeight="600" borderWidth={etat === "SAUTE" ? "1px" : 0} borderColor="gris">
                {l.etatEtape(etat)}
              </Box>
              <Box color="gris">
                <LuChevronRight />
              </Box>
            </HStack>
          </Link>
        ))}
      </Stack>

      <Button asChild size="lg" colorPalette="emeraude" variant={pretAEnvoyer && !envoye ? "solid" : "outline"}>
        <Link href="/candidat/recapitulatif">
          {envoye ? tr("Voir mon récapitulatif", "See my summary") : tr("Récapitulatif et envoi", "Summary and sending")} <LuArrowRight />
        </Link>
      </Button>

      {consultations && consultations.nombre > 0 && (
        <HStack gap="3" bg="surface" borderRadius="carte" boxShadow="carte" p="4">
          <Box w="10" h="10" borderRadius="full" bg="menthe" color="nuit" display="grid" placeItems="center" flexShrink={0}>
            <LuEye />
          </Box>
          <Text fontSize="sm" color="gris">
            {tr(
              `Ton profil a été consulté ${consultations.nombre} fois par des recruteurs (dernière fois le ${formatDate(consultations.derniere!, langue)}).`,
              `Your profile has been viewed ${consultations.nombre} times by recruiters (last on ${formatDate(consultations.derniere!, langue)}).`,
            )}
          </Text>
        </HStack>
      )}
    </Stack>
  );
}
