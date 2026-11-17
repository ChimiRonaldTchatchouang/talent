"use client";

import { MARQUE } from "@bdt/shared";
import { Box, Button, HStack, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuX } from "react-icons/lu";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";

/** Modèles de messages (le candidat est tutoyé). Ils restent modifiables avant l'envoi. */
const MODELES: { cle: string; libelle: string; texte: (prenom: string, site: string) => string }[] = [
  {
    cle: "dossier",
    libelle: "Dossier à terminer",
    texte: (p, s) => `Bonjour ${p}, c'est le cabinet ${MARQUE.nom}. Ton dossier n'est pas encore terminé : connecte-toi sur ${s} pour le compléter. Nous restons disponibles si tu as besoin d'aide.`,
  },
  {
    cle: "piece",
    libelle: "Pièce à redéposer",
    texte: (p, s) => `Bonjour ${p}, c'est le cabinet ${MARQUE.nom}. Une de tes pièces est à redéposer : le motif est indiqué dans ton espace, sur ${s}.`,
  },
  {
    cle: "grade",
    libelle: "Grade confirmé",
    texte: (p, s) => `Bonjour ${p}, bonne nouvelle : le cabinet ${MARQUE.nom} a confirmé ton grade. Retrouve le détail dans ton espace sur ${s}.`,
  },
  {
    cle: "rdv",
    libelle: "Proposer un rendez-vous",
    texte: (p) => `Bonjour ${p}, c'est le cabinet ${MARQUE.nom}. Nous aimerions faire le point avec toi sur ton dossier. Quand es-tu disponible cette semaine ?`,
  },
  {
    cle: "offre",
    libelle: "Nouvelle opportunité",
    texte: (p, s) => `Bonjour ${p}, c'est le cabinet ${MARQUE.nom}. Une nouvelle opportunité correspond à ton profil : ouvre l'onglet « Opportunités » de ton espace sur ${s}.`,
  },
  { cle: "libre", libelle: "Message libre", texte: (p) => `Bonjour ${p}, ` },
];

/**
 * Prévenir un candidat sur WhatsApp : le message est préparé ici, puis WhatsApp s'ouvre (application ou
 * WhatsApp Web) sur la conversation avec son numéro, message prérempli. L'administrateur n'a plus qu'à envoyer.
 * Chaque préparation est inscrite au journal par l'API.
 */
export function BoutonWhatsApp({ dossierId, prenom, telephone, taille = "sm" }: { dossierId: string; prenom: string; telephone: string | null; taille?: "xs" | "sm" }) {
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  const [modele, setModele] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const site = typeof window !== "undefined" ? window.location.host : "";

  function choisir(cle: string) {
    const m = MODELES.find((x) => x.cle === cle)!;
    setModele(cle);
    setMessage(m.texte(prenom || "", site));
  }

  async function ouvrirWhatsApp() {
    // La fenêtre est ouverte tout de suite (sinon le navigateur la bloque), puis dirigée vers WhatsApp.
    const fenetre = window.open("", "_blank");
    setEnvoi(true);
    try {
      const { lien } = await api<{ lien: string }>(`/admin/dossiers/${dossierId}/whatsapp`, { methode: "POST", corps: { message } });
      if (fenetre) fenetre.location.href = lien;
      else window.location.href = lien;
      toaster.create({ type: "success", title: "WhatsApp est ouvert : il ne reste qu'à envoyer le message." });
      setOuvert(false);
    } catch (e) {
      fenetre?.close();
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!telephone) {
    return (
      <Button size={taille} variant="outline" disabled title="Aucun numéro de téléphone">
        <FaWhatsapp /> WhatsApp
      </Button>
    );
  }

  return (
    <Box position="relative">
      <Button
        size={taille}
        bg="#25D366"
        color="white"
        _hover={{ bg: "#1EBE5B" }}
        onClick={() => {
          setOuvert((o) => !o);
          if (!modele) choisir("libre");
        }}
        aria-expanded={ouvert}
      >
        <FaWhatsapp /> WhatsApp
      </Button>
      {ouvert && (
        <Stack
          className="bdt-page"
          position={{ base: "fixed", md: "absolute" }}
          inset={{ base: "auto 12px 12px 12px", md: "auto" }}
          top={{ md: "calc(100% + 8px)" }}
          right={{ md: "0" }}
          w={{ md: "420px" }}
          zIndex="30"
          bg="white"
          borderRadius="16px"
          boxShadow="0 20px 50px rgba(15, 42, 74, 0.25)"
          p="4"
          gap="3"
        >
          <HStack justify="space-between">
            <Stack gap="0">
              <Text fontWeight="700" color="nuit">
                Message WhatsApp
              </Text>
              <Text fontSize="xs" color="gris">
                Vers {telephone}
              </Text>
            </Stack>
            <Button size="xs" variant="ghost" onClick={() => setOuvert(false)} aria-label="Fermer">
              <LuX />
            </Button>
          </HStack>
          <HStack gap="1.5" wrap="wrap">
            {MODELES.map((m) => (
              <Button key={m.cle} size="xs" variant={modele === m.cle ? "solid" : "outline"} colorPalette="emeraude" borderRadius="full" onClick={() => choisir(m.cle)}>
                {m.libelle}
              </Button>
            ))}
          </HStack>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} aria-label="Message" />
          <Text fontSize="xs" color="gris">
            WhatsApp s&apos;ouvre avec ce message déjà écrit : vérifiez-le, puis appuyez sur Envoyer dans WhatsApp.
          </Text>
          <Button bg="#25D366" color="white" _hover={{ bg: "#1EBE5B" }} loading={envoi} disabled={!message.trim()} onClick={ouvrirWhatsApp}>
            <FaWhatsapp /> Ouvrir WhatsApp
          </Button>
        </Stack>
      )}
    </Box>
  );
}
