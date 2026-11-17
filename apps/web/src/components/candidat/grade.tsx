"use client";

import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuCheck, LuClock, LuX } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { useLibelles } from "@/lib/libelles";
import { useLangue } from "@/lib/preferences";
import type { Classement, ElementExplique, ServicePropose } from "@/lib/types";

/** Carte du grade : la lettre accompagne toujours la couleur, avec la mention provisoire ou confirmé. */
export function CarteGrade({ c }: { c: Classement }) {
  const confirme = c.etat !== "PROVISOIRE";
  const l = useLibelles();
  const { tr } = useLangue();
  return (
    <HStack gap="4" align="center">
      <PastilleGrade grade={c.grade} taille="lg" />
      <Stack gap="1">
        <Text fontWeight="700" fontSize="lg" color="titre">
          {l.nomGrade(c.grade)} · {l.grade(c.grade)}
        </Text>
        <Box>
          <Badge
            borderRadius="full"
            px="3"
            py="1"
            fontWeight="600"
            bg={confirme ? "emeraude.600" : "surface"}
            color={confirme ? "white" : "gris"}
            borderWidth={confirme ? 0 : "1px"}
            borderStyle="dashed"
            borderColor="gris"
          >
            {confirme ? tr("Confirmé", "Confirmed") : tr("Provisoire", "Provisional")}
          </Badge>
        </Box>
      </Stack>
    </HStack>
  );
}

const ICONES = { FAIT: LuCheck, EN_ATTENTE: LuClock, MANQUANT: LuX } as const;
const COULEURS = {
  FAIT: { bg: "menthe", color: "nuit" },
  EN_ATTENTE: { bg: "brume", color: "nuit" },
  MANQUANT: { bg: "etat.refuse", color: "etat.refuseTexte" },
} as const;

/** Un des quatre éléments du grade, avec son état et la raison. */
export function LigneElement({ e }: { e: ElementExplique }) {
  const Icone = ICONES[e.etat];
  const l = useLibelles();
  return (
    <HStack align="flex-start" gap="3" bg="surface" borderRadius="carte" p="4" boxShadow="carte">
      <Box w="8" h="8" borderRadius="full" bg={COULEURS[e.etat].bg} color={COULEURS[e.etat].color} display="grid" placeItems="center" flexShrink={0}>
        <Icone aria-hidden />
      </Box>
      <Stack gap="0.5" flex="1">
        <HStack justify="space-between" wrap="wrap" gap="2">
          <Text fontWeight="700" color="titre">
            {l.element(e.element)}
          </Text>
          <Text fontSize="sm" fontWeight="600" color={e.etat === "MANQUANT" ? "#E5484D" : "gris"}>
            {l.etatElement(e.etat)}
          </Text>
        </HStack>
        <Text fontSize="sm" color="gris">
          {l.raison(e.element, e.etat, e.raison)}
        </Text>
      </Stack>
    </HStack>
  );
}

/** Service du cabinet, avec le bouton « Je suis intéressé ». */
export function CarteService({ s, onChange }: { s: ServicePropose; onChange: (c: Classement) => void }) {
  const [envoi, setEnvoi] = useState(false);
  const l = useLibelles();
  const { tr } = useLangue();
  async function interesse() {
    setEnvoi(true);
    try {
      onChange(await api<Classement>(`/candidat/services/${s.id}/interet`, { methode: "POST" }));
      toaster.create({ type: "success", title: tr("C'est noté ! Le cabinet va te contacter.", "Noted! The agency will contact you.") });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Stack className="bdt-cliquable" gap="2" bg="surface" borderRadius="carte" p="4" boxShadow="carte" borderLeftWidth="4px" borderLeftColor={s.suggere ? "emeraude.600" : "brume"}>
      <HStack justify="space-between" align="flex-start" gap="2">
        <Text fontWeight="700" color="titre">
          {s.nom}
        </Text>
        {s.etat !== "SUGGERE" && (
          <Badge bg={s.etat === "REALISE" ? "menthe" : "brume"} color="nuit" borderRadius="full" px="3">
            {l.etatService(s.etat)}
          </Badge>
        )}
      </HStack>
      {s.description && (
        <Text fontSize="sm" color="gris">
          {s.description}
        </Text>
      )}
      {s.duree && s.duree !== "À préciser" && (
        <Text fontSize="sm" color="gris">
          {tr("Durée", "Duration")} : {s.duree}
        </Text>
      )}
      {s.etat === "SUGGERE" && (
        <Button size="md" colorPalette="emeraude" variant={s.suggere ? "solid" : "outline"} alignSelf="flex-start" loading={envoi} onClick={interesse}>
          {tr("Je suis intéressé(e)", "I'm interested")}
        </Button>
      )}
    </Stack>
  );
}
