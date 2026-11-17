"use client";

import { Box, Button, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuBell, LuBriefcaseBusiness, LuCalendar, LuCheck, LuLock, LuMapPin, LuSparkles, LuTag } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { useNotificationsNonLues } from "@/components/candidat/contexte-notifications";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { formatDate, useLangue } from "@/lib/preferences";
import type { OffreCandidat } from "@/lib/types";

type Detail = OffreCandidat & { description: string | null; grade: string | null };

export default function DetailOffre() {
  const { id } = useParams<{ id: string }>();
  const { tr, langue } = useLangue();
  const { rafraichir } = useNotificationsNonLues();
  const [o, setO] = useState<Detail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api<Detail>(`/candidat/offres/${id}`)
      .then((d) => {
        setO(d);
        // Offre verrouillée : l'API vient d'ajouter une notification.
        if (!d.accessible) rafraichir();
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, [id, rafraichir]);

  async function interesse() {
    setEnvoi(true);
    try {
      await api(`/candidat/offres/${id}/interet`, { methode: "POST" });
      setO((x) => (x ? { ...x, interesse: true } : x));
      toaster.create({ type: "success", title: tr("C'est noté ! Le cabinet va te contacter.", "Noted! The agency will contact you.") });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  const retour = (
    <Button asChild variant="ghost" size="sm" alignSelf="flex-start" color="gris">
      <Link href="/candidat/opportunites">
        <LuArrowLeft /> {tr("Toutes les opportunités", "All opportunities")}
      </Link>
    </Button>
  );

  if (erreur)
    return (
      <Stack gap="4">
        {retour}
        <Text color="gris">{erreur}</Text>
      </Stack>
    );
  if (!o) return <Spinner color="emeraude.600" />;

  const infos = [
    { icone: LuMapPin, texte: [o.ville, o.pays].filter(Boolean).join(", ") },
    o.domaine && { icone: LuTag, texte: o.domaine },
    o.typeContrat && { icone: LuBriefcaseBusiness, texte: o.typeContrat },
    o.dateLimite && { icone: LuCalendar, texte: `${tr("Jusqu'au", "Until")} ${formatDate(o.dateLimite, langue)}` },
  ].filter(Boolean) as { icone: typeof LuMapPin; texte: string }[];

  return (
    <Stack gap="5">
      {retour}
      <Carte position="relative" overflow="hidden" className="bdt-page">
        <Stack gap="4">
          <HStack gap="3" align="flex-start">
            <PastilleGrade grade={o.gradeRequis} taille="lg" />
            <Stack gap="1" flex="1">
              <Heading as="h1" fontSize="2xl" color="titre" lineHeight="1.25">
                {o.titre}
              </Heading>
              <Text fontSize="sm" color="gris">
                {tr(`Grade ${o.gradeRequis}${o.gradeRequis === "A" ? "" : " ou plus"} requis`, `Grade ${o.gradeRequis}${o.gradeRequis === "A" ? "" : " or higher"} required`)}
              </Text>
            </Stack>
          </HStack>
          <Stack gap="2">
            {infos.map(({ icone: I, texte }) => (
              <HStack key={texte} gap="2" color="gris" fontSize="sm">
                <I /> <Text>{texte}</Text>
              </HStack>
            ))}
          </Stack>
        </Stack>
      </Carte>

      {o.accessible ? (
        <>
          <Carte>
            <Text fontWeight="700" color="titre" mb="2">
              {tr("Description", "Description")}
            </Text>
            <Text color="encre" whiteSpace="pre-line" fontSize="sm" lineHeight="1.7">
              {o.description}
            </Text>
          </Carte>
          {o.interesse ? (
            <HStack gap="3" bg="menthe" color="nuit" borderRadius="carte" p="4">
              <LuCheck />
              <Text fontWeight="600">{tr("Tu es intéressé(e) : le cabinet a été prévenu et va te contacter.", "You're interested: the agency has been notified and will contact you.")}</Text>
            </HStack>
          ) : (
            <Button size="lg" colorPalette="emeraude" loading={envoi} onClick={interesse}>
              {tr("Je suis intéressé(e)", "I'm interested")}
            </Button>
          )}
          <Text fontSize="xs" color="gris" textAlign="center">
            {tr("Le cabinet organise la mise en relation. La plateforme ne promet ni emploi, ni visa, ni départ.", "The agency arranges the introduction. The platform does not promise a job, a visa or departure.")}
          </Text>
        </>
      ) : (
        <Carte bg="nuit" color="white" textAlign="center" py="8" position="relative" overflow="hidden">
          <Box position="absolute" left="-10" top="-10" w="40" h="40" borderRadius="full" bg="menthe" opacity="0.1" />
          <Box className="bdt-cadenas" mx="auto" mb="4" w="16" h="16" borderRadius="full" bg="whiteAlpha.200" display="grid" placeItems="center" fontSize="2xl" color="menthe">
            <LuLock />
          </Box>
          <Text fontWeight="700" fontSize="lg" mb="2">
            {o.blocage === "DOSSIER_NON_ENVOYE"
              ? tr("Envoie ton dossier pour voir cette offre", "Send your file to see this offer")
              : o.blocage === "GRADE_NON_CONFIRME"
                ? tr("Ton grade doit d'abord être confirmé", "Your grade must first be confirmed")
                : tr(`Passe au grade ${o.gradeRequis} pour consulter cette offre`, `Reach grade ${o.gradeRequis} to view this offer`)}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.800" maxW="sm" mx="auto" mb="5">
            {o.blocage === "DOSSIER_NON_ENVOYE"
              ? tr("Termine les étapes de ton dossier et envoie-le au cabinet.", "Complete your file steps and send it to the agency.")
              : o.blocage === "GRADE_NON_CONFIRME"
                ? tr("Le cabinet vérifie tes pièces puis confirme ton grade. Tu pourras alors ouvrir l'offre.", "The agency checks your documents and then confirms your grade. You'll then be able to open the offer.")
                : tr("Les services du cabinet t'aident à réunir ce qui te manque.", "The agency's services help you get what you're missing.")}
          </Text>
          <HStack justify="center" gap="2" fontSize="xs" color="whiteAlpha.700" mb="5">
            <LuBell /> <Text>{tr("Nous t'avons laissé une notification.", "We left you a notification.")}</Text>
          </HStack>
          <Button asChild bg="menthe" color="nuit" _hover={{ bg: "#64e38f" }} size="lg">
            <Link href={o.blocage === "DOSSIER_NON_ENVOYE" ? "/candidat" : "/candidat/services"}>
              {o.blocage === "DOSSIER_NON_ENVOYE" ? (
                tr("Continuer mon dossier", "Continue my file")
              ) : (
                <>
                  <LuSparkles /> {tr("Voir les services", "See the services")}
                </>
              )}
            </Link>
          </Button>
        </Carte>
      )}
    </Stack>
  );
}
