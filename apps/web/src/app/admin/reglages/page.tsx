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
  html: string | null;
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
  const [demo, setDemo] = useState<{ candidats: number; recruteurs: number; actif: boolean } | null>(null);
  const [comptesDemo, setComptesDemo] = useState<{ candidat: { identifiant: string; motDePasse: string }; recruteur: { identifiant: string; motDePasse: string } } | null>(null);
  const [effacerDemo, setEffacerDemo] = useState(false);
  const [occupeDemo, setOccupeDemo] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    api<Reglages>("/admin/reglages").then(setReglages).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
    chargerEmails();
    api<{ candidats: number; recruteurs: number; actif: boolean }>("/admin/demo").then(setDemo).catch(() => undefined);
  }, []);

  async function actionDemo(methode: "POST" | "DELETE") {
    setOccupeDemo(true);
    try {
      const r = await api<{ candidats: number; recruteurs: number; actif: boolean; comptes?: typeof comptesDemo }>("/admin/demo", { methode });
      setDemo(r);
      setComptesDemo(r.comptes ?? null);
      setEffacerDemo(false);
      toaster.create({ type: "success", title: methode === "POST" ? "Données de démonstration créées." : "Données de démonstration effacées." });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setOccupeDemo(false);
    }
  }

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
        <Heading as="h2" size="md" color="nuit" mb="1">
          Données de démonstration
        </Heading>
        <Text color="gris" mb="4">
          Environ 20 candidats fictifs, marqués « DÉMO », de tous les grades, avec un compte candidat et un compte recruteur de test.
          Ils ne sont jamais montrés aux vrais recruteurs et ne reçoivent aucun e-mail.
        </Text>
        {comptesDemo && (
          <Alert.Root status="warning" borderRadius="carte" mb="4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Comptes de test (mots de passe affichés une seule fois)</Alert.Title>
              <Alert.Description>
                Candidat : {comptesDemo.candidat.identifiant} / {comptesDemo.candidat.motDePasse}
                <br />
                Recruteur : {comptesDemo.recruteur.identifiant} / {comptesDemo.recruteur.motDePasse}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
        {demo?.actif ? (
          <Stack direction={{ base: "column", md: "row" }} gap="3" align={{ md: "center" }}>
            <Text fontSize="sm">
              {demo.candidats} candidat(s) et {demo.recruteurs} recruteur(s) de démonstration présents.
            </Text>
            {effacerDemo ? (
              <Stack direction="row" gap="2">
                <Button size="sm" variant="ghost" onClick={() => setEffacerDemo(false)}>
                  Annuler
                </Button>
                <Button size="sm" bg="etat.refuseTexte" color="white" loading={occupeDemo} onClick={() => actionDemo("DELETE")}>
                  Oui, tout effacer
                </Button>
              </Stack>
            ) : (
              <Button size="sm" variant="outline" color="etat.refuseTexte" onClick={() => setEffacerDemo(true)}>
                Effacer les données de démonstration
              </Button>
            )}
          </Stack>
        ) : (
          <Button size="sm" colorPalette="emeraude" loading={occupeDemo} onClick={() => actionDemo("POST")}>
            Créer les données de démonstration
          </Button>
        )}
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
              {ouvert === m.id &&
                (m.html ? (
                  // Aperçu de l'e-mail tel qu'il est reçu (cadre isolé : aucun script, aucun lien actif).
                  <Box mt="3">
                    <iframe title={`Aperçu : ${m.sujet}`} srcDoc={m.html} sandbox="" style={{ width: "100%", height: 640, border: 0, borderRadius: 8, background: "#F8F9FF" }} />
                    {m.erreur && (
                      <Text fontSize="sm" color="etat.refuseTexte" mt="2">
                        Erreur : {m.erreur}
                      </Text>
                    )}
                  </Box>
                ) : (
                  <Text whiteSpace="pre-wrap" fontSize="sm" mt="3" bg="white" p="3" borderRadius="md" wordBreak="break-all">
                    {m.texte}
                    {m.erreur && `\n\nErreur : ${m.erreur}`}
                  </Text>
                ))}
            </Box>
          ))}
        </Stack>
      </Carte>
    </Stack>
  );
}
