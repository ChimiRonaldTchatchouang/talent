"use client";

import type { TypePiece } from "@bdt/shared";
import { Alert, Box, Button, Heading, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuCamera, LuEye, LuFileUp, LuPlus, LuTrash2 } from "react-icons/lu";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import { useDossier } from "@/lib/dossier";
import { useLibelles } from "@/lib/libelles";
import { useLangue } from "@/lib/preferences";
import { televerser } from "@/lib/televersement";
import type { PieceDeposee } from "@/lib/types";

interface Envoi {
  type: string;
  pieceId?: string;
  fichier: File;
}

const AIDE: Partial<Record<TypePiece, [string, string]>> = {
  IDENTITE: ["Carte nationale d'identité ou passeport, page avec ta photo.", "National ID card or passport, the page with your photo."],
  CERTIFICAT_TRAVAIL: ["Un document par employeur. Tu peux en ajouter plusieurs.", "One document per employer. You can add several."],
  CV: ["Ton CV, même simple.", "Your CV, even a simple one."],
};

export default function Justificatifs() {
  const { reponse, recharger } = useDossier();
  const { tr } = useLangue();
  const l = useLibelles();
  const [enAttente, setEnAttente] = useState<Envoi[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);
  const cible = useRef<{ type: string; pieceId?: string } | null>(null);
  const champPhoto = useRef<HTMLInputElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const envoyer = useCallback(
    async (envoi: Envoi) => {
      setEnCours(envoi.pieceId ?? envoi.type);
      try {
        const r = await televerser(envoi.type, envoi.fichier, envoi.pieceId);
        toaster.create({ type: "success", title: r.message });
        setEnAttente((l) => l.filter((x) => x !== envoi));
        await recharger();
      } catch (e) {
        if (e instanceof ErreurClient && e.statut === 0) {
          // Réseau coupé : le fichier est gardé et renvoyé automatiquement au retour du réseau.
          setEnAttente((l) => (l.includes(envoi) ? l : [...l, envoi]));
        } else {
          setEnAttente((l) => l.filter((x) => x !== envoi));
          toaster.create({ type: "error", title: messageErreur(e) });
        }
      } finally {
        setEnCours(null);
      }
    },
    [recharger],
  );

  useEffect(() => {
    const auRetour = () => enAttente.forEach((e) => void envoyer(e));
    window.addEventListener("online", auRetour);
    return () => window.removeEventListener("online", auRetour);
  }, [enAttente, envoyer]);

  function choisir(mode: "photo" | "fichier", type: string, pieceId?: string) {
    cible.current = { type, pieceId };
    (mode === "photo" ? champPhoto : champFichier).current?.click();
  }

  function fichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (fichier && cible.current) void envoyer({ ...cible.current, fichier });
  }

  async function voir(p: PieceDeposee) {
    try {
      const { chemin, url } = await api<{ chemin: string; url: string | null }>(`/candidat/pieces/${p.id}/lien`);
      window.open(url ?? `/api${chemin}`, "_blank", "noopener");
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function retirer(p: PieceDeposee) {
    try {
      await api(`/candidat/pieces/${p.id}`, { methode: "DELETE" });
      toaster.create({ type: "success", title: tr("Pièce retirée.", "Document removed.") });
      await recharger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  if (!reponse) return <Spinner color="emeraude.600" />;
  const { requises, deposees } = reponse.pieces;

  const boutonsDepot = (type: string, pieceId?: string, libelle?: string) => (
    <HStack gap="2" wrap="wrap">
      <Button size="md" colorPalette="emeraude" onClick={() => choisir("photo", type, pieceId)} loading={enCours === (pieceId ?? type)}>
        <LuCamera /> {libelle ?? tr("Prendre une photo", "Take a photo")}
      </Button>
      <Button size="md" variant="outline" colorPalette="emeraude" onClick={() => choisir("fichier", type, pieceId)} disabled={enCours !== null}>
        <LuFileUp /> {tr("Choisir un fichier", "Choose a file")}
      </Button>
    </HStack>
  );

  const lignePiece = (p: PieceDeposee) => (
    <Stack key={p.id} gap="2" bg="brume" borderRadius="carte" p="3">
      <HStack justify="space-between" wrap="wrap" gap="2">
        <Text fontSize="sm" color="titre" fontWeight="600" truncate maxW="60%">
          {p.nomFichier}
        </Text>
        <Box as="span" borderRadius="full" px="3" py="1" fontSize="xs" fontWeight="600" bg={p.etat === "VERIFIEE" ? "menthe" : p.etat === "REFUSEE" ? "etat.refuse" : "surface"} color={p.etat === "REFUSEE" ? "etat.refuseTexte" : p.etat === "VERIFIEE" ? "nuit" : "gris"}>
          {p.etat === "VERIFIEE" ? tr("Vérifiée", "Verified") : p.etat === "REFUSEE" ? tr("Refusée", "Rejected") : tr("En attente", "Pending")}
        </Box>
      </HStack>
      {p.etat === "REFUSEE" && (
        <Text fontSize="sm" color="etat.refuseTexte">
          {tr("Motif du refus", "Reason")} : {p.motifRefus}
        </Text>
      )}
      <HStack gap="2" wrap="wrap">
        <Button size="xs" variant="ghost" onClick={() => voir(p)}>
          <LuEye /> {tr("Voir", "View")}
        </Button>
        {p.etat !== "VERIFIEE" && (
          <>
            <Button size="xs" variant="ghost" onClick={() => choisir("fichier", p.type, p.id)}>
              <LuFileUp /> {tr("Remplacer", "Replace")}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => retirer(p)}>
              <LuTrash2 /> {tr("Retirer", "Remove")}
            </Button>
          </>
        )}
      </HStack>
    </Stack>
  );

  const ignorees = deposees.filter((p) => p.ignoree);

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="titre">
          {tr("Justificatifs", "Supporting documents")}
        </Heading>
        <Text color="gris">
          {tr(
            "Prends une photo nette de chaque document, ou choisis un fichier (JPG, PNG ou PDF, 10 Mo maximum).",
            "Take a clear photo of each document, or choose a file (JPG, PNG or PDF, 10 MB max).",
          )}
        </Text>
      </Stack>

      <input ref={champPhoto} type="file" accept="image/*" capture="environment" hidden onChange={fichierChoisi} />
      <input ref={champFichier} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={fichierChoisi} />

      {enAttente.length > 0 && (
        <Alert.Root status="warning" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{tr("Ton fichier sera envoyé dès que le réseau revient.", "Your file will be sent as soon as the network is back.")}</Alert.Title>
            <Alert.Description>
              <Button size="sm" variant="plain" px="0" color="emeraude.600" onClick={() => enAttente.forEach((e) => void envoyer(e))}>
                {tr("Réessayer maintenant", "Try again now")}
              </Button>
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {requises.map(({ type, manquante }) => {
        const pieces = deposees.filter((p) => p.type === type && !p.ignoree);
        const multiple = type === "CERTIFICAT_TRAVAIL";
        return (
          <Carte key={type}>
            <Stack gap="3">
              <HStack justify="space-between" align="flex-start" gap="3">
                <Box>
                  <Text fontWeight="700" color="titre">
                    {l.piece(type as TypePiece)}
                  </Text>
                  {AIDE[type as TypePiece] && (
                    <Text fontSize="sm" color="gris">
                      {tr(...AIDE[type as TypePiece]!)}
                    </Text>
                  )}
                </Box>
                {manquante && pieces.length === 0 && (
                  <Text fontSize="sm" color="gris" whiteSpace="nowrap">
                    {tr("À déposer", "To upload")}
                  </Text>
                )}
              </HStack>
              {pieces.map(lignePiece)}
              {pieces.length === 0 && boutonsDepot(type)}
              {multiple && pieces.length > 0 && (
                <Button size="sm" variant="outline" colorPalette="emeraude" alignSelf="flex-start" onClick={() => choisir("fichier", type)}>
                  <LuPlus /> {tr("Ajouter un autre certificat", "Add another certificate")}
                </Button>
              )}
            </Stack>
          </Carte>
        );
      })}

      {ignorees.length > 0 && (
        <Carte bg="brume" boxShadow="none">
          <Text fontWeight="600" color="titre" mb="2">
            {tr("Documents qui ne sont plus demandés", "Documents no longer required")}
          </Text>
          <Text fontSize="sm" color="gris" mb="3">
            {tr("Tu as changé une réponse : ces documents sont gardés mais ne comptent pas pour l'instant.", "You changed an answer: these documents are kept but don't count for now.")}
          </Text>
          <Stack gap="2">{ignorees.map(lignePiece)}</Stack>
        </Carte>
      )}

      <Button asChild size="lg" colorPalette="emeraude">
        <Link href="/candidat/recapitulatif">{tr("Continuer vers le récapitulatif", "Continue to the summary")}</Link>
      </Button>
      <Text fontSize="sm" color="gris" textAlign="center">
        {tr("Il te manque un document ? Tu peux quand même envoyer ton dossier et le déposer plus tard.", "Missing a document? You can still send your file and upload it later.")}
      </Text>
    </Stack>
  );
}
