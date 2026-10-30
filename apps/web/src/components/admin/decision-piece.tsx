"use client";

import { MOTIFS_REFUS_RAPIDES } from "@bdt/shared";
import { Button, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuCheck, LuEye, LuX } from "react-icons/lu";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";

/** Ouvre le document dans un nouvel onglet (lien temporaire, consultation journalisée). */
export async function ouvrirPiece(id: string) {
  try {
    const { chemin, url } = await api<{ chemin: string; url: string | null }>(`/admin/pieces/${id}/lien`);
    window.open(url ?? `/api${chemin}`, "_blank", "noopener");
  } catch (e) {
    toaster.create({ type: "error", title: messageErreur(e) });
  }
}

/** Boutons « Vérifiée » / « Refuser » (motif obligatoire : choix rapide + texte libre). */
export function DecisionPiece({ id, onFait }: { id: string; onFait: () => void }) {
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function decider(decision: "VERIFIEE" | "REFUSEE") {
    setEnvoi(true);
    try {
      await api(`/admin/pieces/${id}/decision`, { methode: "POST", corps: decision === "VERIFIEE" ? { decision } : { decision, motif } });
      toaster.create({ type: "success", title: decision === "VERIFIEE" ? "Pièce vérifiée." : "Pièce refusée : le candidat est prévenu." });
      onFait();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (refus) {
    return (
      <Stack gap="2" bg="etat.refuse" borderRadius="carte" p="3">
        <Text fontSize="sm" fontWeight="600" color="etat.refuseTexte">
          Motif du refus (envoyé au candidat)
        </Text>
        <HStack gap="1" wrap="wrap">
          {MOTIFS_REFUS_RAPIDES.map((m) => (
            <Button key={m} size="xs" variant={motif === m ? "solid" : "outline"} bg={motif === m ? undefined : "white"} onClick={() => setMotif(m)}>
              {m}
            </Button>
          ))}
        </HStack>
        <Input size="sm" bg="white" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ou écrivez le motif" />
        <HStack>
          <Button size="sm" variant="ghost" onClick={() => setRefus(false)}>
            Annuler
          </Button>
          <Button size="sm" bg="etat.refuseTexte" color="white" disabled={motif.trim().length < 3} loading={envoi} onClick={() => decider("REFUSEE")}>
            Confirmer le refus
          </Button>
        </HStack>
      </Stack>
    );
  }
  return (
    <HStack gap="2" wrap="wrap">
      <Button size="sm" variant="outline" onClick={() => ouvrirPiece(id)}>
        <LuEye /> Voir
      </Button>
      <Button size="sm" colorPalette="emeraude" loading={envoi} onClick={() => decider("VERIFIEE")}>
        <LuCheck /> Vérifiée
      </Button>
      <Button size="sm" variant="outline" color="etat.refuseTexte" onClick={() => setRefus(true)}>
        <LuX /> Refuser
      </Button>
    </HStack>
  );
}
