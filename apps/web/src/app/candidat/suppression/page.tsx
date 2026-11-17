"use client";

import { Alert, Button, Checkbox, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import { formatDate, useLangue } from "@/lib/preferences";

/** Demande de suppression du dossier (W10), avec confirmation dans la page. */
export default function DemandeSuppression() {
  const [demande, setDemande] = useState<{ demandeLe: string } | null | undefined>(undefined);
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const { tr, langue } = useLangue();

  useEffect(() => {
    api<{ demande: { demandeLe: string } | null }>("/candidat/suppression").then((r) => setDemande(r.demande)).catch(() => setDemande(null));
  }, []);

  async function agir(methode: "POST" | "DELETE") {
    setEnvoi(true);
    try {
      const r = await api<{ demande: { demandeLe: string } | null }>("/candidat/suppression", methode === "POST" ? { methode, corps: { confirmation: true } } : { methode });
      setDemande(r.demande);
      toaster.create({ type: "success", title: methode === "POST" ? tr("Ta demande est envoyée au cabinet.", "Your request has been sent to the agency.") : tr("Ta demande est annulée.", "Your request has been cancelled.") });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (demande === undefined) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="5">
      <Heading as="h1" size="2xl" color="titre">
        {tr("Supprimer mon dossier", "Delete my file")}
      </Heading>
      {demande ? (
        <Carte>
          <Alert.Root status="info" borderRadius="carte" mb="4">
            <Alert.Indicator />
            <Alert.Title>
              {tr(
                `Ta demande du ${formatDate(demande.demandeLe, langue)} est en cours de traitement par le cabinet.`,
                `Your request of ${formatDate(demande.demandeLe, langue)} is being processed by the agency.`,
              )}
            </Alert.Title>
          </Alert.Root>
          <Button variant="outline" loading={envoi} onClick={() => agir("DELETE")}>
            {tr("J'ai changé d'avis : annuler ma demande", "I changed my mind: cancel my request")}
          </Button>
        </Carte>
      ) : (
        <Carte>
          <Stack gap="4">
            <Text>
              {tr(
                "Si tu demandes la suppression, le cabinet effacera définitivement ton dossier, tes documents et ton compte. Tu ne pourras plus être présenté aux recruteurs, et tu recevras une confirmation par e-mail si tu en as un.",
                "If you request deletion, the agency will permanently erase your file, your documents and your account. You will no longer be introduced to recruiters, and you will receive an email confirmation if you have an email address.",
              )}
            </Text>
            <Checkbox.Root colorPalette="emeraude" checked={confirme} onCheckedChange={(e) => setConfirme(!!e.checked)} alignItems="flex-start">
              <Checkbox.HiddenInput />
              <Checkbox.Control mt="1" />
              <Checkbox.Label fontWeight="400">{tr("Je comprends que mon dossier sera supprimé définitivement.", "I understand that my file will be permanently deleted.")}</Checkbox.Label>
            </Checkbox.Root>
            <Button size="lg" bg="etat.refuseTexte" color="white" disabled={!confirme} loading={envoi} onClick={() => agir("POST")}>
              {tr("Demander la suppression de mon dossier", "Request deletion of my file")}
            </Button>
          </Stack>
        </Carte>
      )}
      <Button asChild variant="plain" color="gris">
        <Link href="/candidat/parametres">{tr("Retour aux paramètres", "Back to settings")}</Link>
      </Button>
    </Stack>
  );
}
