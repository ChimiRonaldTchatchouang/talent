"use client";

import { Alert, Button, Checkbox, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";

/** Demande de suppression du dossier (W10), avec confirmation dans la page. */
export default function DemandeSuppression() {
  const [demande, setDemande] = useState<{ demandeLe: string } | null | undefined>(undefined);
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api<{ demande: { demandeLe: string } | null }>("/candidat/suppression").then((r) => setDemande(r.demande)).catch(() => setDemande(null));
  }, []);

  async function agir(methode: "POST" | "DELETE") {
    setEnvoi(true);
    try {
      const r = await api<{ demande: { demandeLe: string } | null }>("/candidat/suppression", methode === "POST" ? { methode, corps: { confirmation: true } } : { methode });
      setDemande(r.demande);
      toaster.create({ type: "success", title: methode === "POST" ? "Ta demande est envoyée au cabinet." : "Ta demande est annulée." });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (demande === undefined) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="5">
      <Heading as="h1" size="2xl" color="nuit">
        Supprimer mon dossier
      </Heading>
      {demande ? (
        <Carte>
          <Alert.Root status="info" borderRadius="carte" mb="4">
            <Alert.Indicator />
            <Alert.Title>
              Ta demande du {new Date(demande.demandeLe).toLocaleDateString("fr-FR")} est en cours de traitement par le cabinet.
            </Alert.Title>
          </Alert.Root>
          <Button variant="outline" loading={envoi} onClick={() => agir("DELETE")}>
            J&apos;ai changé d&apos;avis : annuler ma demande
          </Button>
        </Carte>
      ) : (
        <Carte>
          <Stack gap="4">
            <Text>
              Si tu demandes la suppression, le cabinet effacera <strong>définitivement</strong> ton dossier, tes documents et ton
              compte. Tu ne pourras plus être présenté aux recruteurs, et tu recevras une confirmation par e-mail si tu en as un.
            </Text>
            <Checkbox.Root colorPalette="emeraude" checked={confirme} onCheckedChange={(e) => setConfirme(!!e.checked)} alignItems="flex-start">
              <Checkbox.HiddenInput />
              <Checkbox.Control mt="1" />
              <Checkbox.Label fontWeight="400">Je comprends que mon dossier sera supprimé définitivement.</Checkbox.Label>
            </Checkbox.Root>
            <Button size="lg" bg="etat.refuseTexte" color="white" disabled={!confirme} loading={envoi} onClick={() => agir("POST")}>
              Demander la suppression de mon dossier
            </Button>
          </Stack>
        </Carte>
      )}
      <Button asChild variant="plain" color="gris">
        <Link href="/candidat">Retour à mon espace</Link>
      </Button>
    </Stack>
  );
}
