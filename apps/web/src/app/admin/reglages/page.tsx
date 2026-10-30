"use client";

import { Alert, Badge, Box, Button, Field, Heading, Input, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";

interface Reglages {
  telephoneCabinet: string | null;
  emailCabinet: string | null;
}
interface Email {
  id: string;
  destinataire: string;
  sujet: string;
  texte: string;
  statut: "ENVOYE" | "ECHEC" | "DEMO";
  erreur: string | null;
  creeLe: string;
}

const STATUTS = {
  ENVOYE: { libelle: "Envoyé", bg: "menthe" },
  ECHEC: { libelle: "Échec", bg: "etat.refuse" },
  DEMO: { libelle: "Démo (non envoyé)", bg: "brume" },
};

export default function PageReglages() {
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [emails, setEmails] = useState<{ modeDemo: boolean; expediteur: string | null; emails: Email[] } | null>(null);
  const [test, setTest] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    api<Reglages>("/admin/reglages").then(setReglages).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
    chargerEmails();
  }, []);

  function chargerEmails() {
    api<{ modeDemo: boolean; expediteur: string | null; emails: Email[] }>("/admin/emails").then(setEmails).catch(() => undefined);
  }

  async function envoyerTest() {
    setTest(true);
    try {
      const r = await api<{ statut: Email["statut"]; erreur: string | null; destinataire: string }>("/admin/emails/test", { methode: "POST" });
      if (r.statut === "ENVOYE") toaster.create({ type: "success", title: `E-mail de test envoyé à ${r.destinataire}. Vérifiez votre boîte (et les spams).` });
      else if (r.statut === "DEMO") toaster.create({ type: "info", title: "Mode démo : l'e-mail n'est pas parti. Configurez RESEND_API_KEY sur Render." });
      else toaster.create({ type: "error", title: `Échec de l'envoi : ${r.erreur ?? "erreur inconnue"}` });
      chargerEmails();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setTest(false);
    }
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      setReglages(
        await api<Reglages>("/admin/reglages", {
          methode: "PUT",
          corps: { telephoneCabinet: reglages!.telephoneCabinet || null, emailCabinet: reglages!.emailCabinet || null },
        }),
      );
      toaster.create({ type: "success", title: "Réglages enregistrés." });
    } catch (err) {
      if (err instanceof ErreurClient && err.details) setErreurs(err.details);
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!reglages) return <Spinner color="emeraude.600" />;

  return (
    <Stack gap="6">
      <Heading as="h1" size="2xl" color="nuit">
        Réglages
      </Heading>

      <Carte as="form" onSubmit={enregistrer}>
        <Heading as="h2" size="md" color="nuit" mb="1">
          Coordonnées du cabinet
        </Heading>
        <Text color="gris" mb="4">
          Affichées aux candidats qui ont oublié leur mot de passe et n&apos;ont pas d&apos;e-mail.
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" mb="4">
          <Field.Root invalid={!!erreurs.telephoneCabinet}>
            <Field.Label>Téléphone du cabinet</Field.Label>
            <Input bg="brume" value={reglages.telephoneCabinet ?? ""} onChange={(e) => setReglages({ ...reglages, telephoneCabinet: e.target.value })} />
            <Field.ErrorText>{erreurs.telephoneCabinet}</Field.ErrorText>
          </Field.Root>
          <Field.Root invalid={!!erreurs.emailCabinet}>
            <Field.Label>E-mail du cabinet</Field.Label>
            <Input bg="brume" type="email" value={reglages.emailCabinet ?? ""} onChange={(e) => setReglages({ ...reglages, emailCabinet: e.target.value })} />
            <Field.ErrorText>{erreurs.emailCabinet}</Field.ErrorText>
          </Field.Root>
        </SimpleGrid>
        <Button type="submit" colorPalette="emeraude" loading={envoi}>
          Enregistrer
        </Button>
      </Carte>

      <Carte>
        <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} mb="3" gap="2">
          <Box>
            <Heading as="h2" size="md" color="nuit">
              E-mails envoyés
            </Heading>
            {emails?.expediteur && (
              <Text fontSize="sm" color="gris">
                Expéditeur : {emails.expediteur}
              </Text>
            )}
          </Box>
          <Button size="sm" variant="outline" colorPalette="emeraude" loading={test} onClick={envoyerTest}>
            Envoyer un e-mail de test
          </Button>
        </Stack>
        {emails?.expediteur?.includes("onboarding@resend.dev") && (
          <Alert.Root status="warning" borderRadius="carte" mb="4">
            <Alert.Indicator />
            <Alert.Title>
              Expéditeur de test de Resend : les e-mails ne partent que vers l&apos;adresse du titulaire du compte Resend. Vérifiez le
              domaine du cabinet dans Resend, puis renseignez EMAIL_EXPEDITEUR sur Render.
            </Alert.Title>
          </Alert.Root>
        )}
        {emails?.modeDemo && (
          <Alert.Root status="info" borderRadius="carte" mb="4">
            <Alert.Indicator />
            <Alert.Title>
              Mode démo : la clé Resend (RESEND_API_KEY) n&apos;est pas configurée sur Render. Les e-mails ne partent pas, ils sont seulement listés ici.
            </Alert.Title>
          </Alert.Root>
        )}
        {emails && emails.emails.length === 0 && <Text color="gris">Aucun e-mail pour le moment.</Text>}
        <Stack gap="2">
          {emails?.emails.map((m) => (
            <Box key={m.id} bg="brume" borderRadius="carte" p="3">
              <Box as="button" w="full" textAlign="left" onClick={() => setOuvert(ouvert === m.id ? null : m.id)}>
                <Stack direction={{ base: "column", md: "row" }} justify="space-between" gap="1">
                  <Text fontWeight="600" color="nuit">
                    {m.sujet}
                  </Text>
                  <Text fontSize="sm" color="gris">
                    {m.destinataire} · {new Date(m.creeLe).toLocaleString("fr-FR")}{" "}
                    <Badge bg={STATUTS[m.statut].bg} borderRadius="full" ml="1">
                      {STATUTS[m.statut].libelle}
                    </Badge>
                  </Text>
                </Stack>
              </Box>
              {ouvert === m.id && (
                <Text whiteSpace="pre-wrap" fontSize="sm" mt="3" bg="white" p="3" borderRadius="md" wordBreak="break-all">
                  {m.texte}
                  {m.erreur && `\n\nErreur : ${m.erreur}`}
                </Text>
              )}
            </Box>
          ))}
        </Stack>
      </Carte>
    </Stack>
  );
}
