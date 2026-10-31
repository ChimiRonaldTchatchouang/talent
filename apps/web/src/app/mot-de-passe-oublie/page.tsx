"use client";

import { Alert, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, ErreurClient, messageErreur } from "@/lib/api";

export default function MotDePasseOublie() {
  const [identifiant, setIdentifiant] = useState("");
  const [reponse, setReponse] = useState<{ message: string; telephoneCabinet: string | null } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      setReponse(await api("/auth/mot-de-passe-oublie", { methode: "POST", corps: { identifiant } }));
    } catch (err) {
      setErreur(err instanceof ErreurClient ? (err.details?.identifiant ?? err.message) : messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <CadreCompte
      titre="Mot de passe oublié"
      sousTitre="Saisis l'e-mail ou le numéro de téléphone de ton compte."
      pied={<Lien href="/connexion">Retour à la connexion</Lien>}
    >
      {reponse ? (
        <Stack gap="3">
          <Alert.Root status="info" borderRadius="carte">
            <Alert.Indicator />
            <Alert.Title>{reponse.message}</Alert.Title>
          </Alert.Root>
          {reponse.telephoneCabinet && (
            <Text>
              Téléphone du cabinet :{" "}
              <a href={`tel:${reponse.telephoneCabinet.replace(/\s/g, "")}`} style={{ fontWeight: 700, color: "#006D33" }}>
                {reponse.telephoneCabinet}
              </a>
            </Text>
          )}
        </Stack>
      ) : (
        <form onSubmit={soumettre} noValidate>
          <Stack gap="5">
            <Field.Root invalid={!!erreur}>
              <Field.Label>E-mail ou téléphone</Field.Label>
              <Input variant="flushed" size="lg" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" />
              <Field.ErrorText>{erreur}</Field.ErrorText>
            </Field.Root>
            <Button type="submit" size="lg" colorPalette="emeraude" borderRadius="full" loading={envoi}>
              Recevoir un lien
            </Button>
          </Stack>
        </form>
      )}
    </CadreCompte>
  );
}
