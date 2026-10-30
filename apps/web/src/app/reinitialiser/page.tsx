"use client";

import { Alert, Button, Field, Input, Stack } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, ErreurClient, messageErreur } from "@/lib/api";

function Formulaire() {
  const jeton = useSearchParams().get("jeton") ?? "";
  const [motDePasse, setMotDePasse] = useState("");
  const [fait, setFait] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      setFait((await api<{ message: string }>("/auth/reinitialiser", { methode: "POST", corps: { jeton, motDePasse } })).message);
    } catch (err) {
      setErreur(err instanceof ErreurClient ? (err.details?.motDePasse ?? err.message) : messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  if (fait) {
    return (
      <Stack gap="4">
        <Alert.Root status="success" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Title>{fait}</Alert.Title>
        </Alert.Root>
        <Lien href="/connexion">Se connecter</Lien>
      </Stack>
    );
  }
  return (
    <form onSubmit={soumettre} noValidate>
      <Stack gap="5">
        <Field.Root invalid={!!erreur}>
          <Field.Label>Nouveau mot de passe</Field.Label>
          <Input size="lg" bg="brume" type="password" autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <Field.HelperText>8 caractères minimum.</Field.HelperText>
          <Field.ErrorText>{erreur}</Field.ErrorText>
        </Field.Root>
        <Button type="submit" size="lg" colorPalette="emeraude" loading={envoi}>
          Enregistrer
        </Button>
      </Stack>
    </form>
  );
}

export default function Reinitialiser() {
  return (
    <CadreCompte titre="Nouveau mot de passe">
      <Suspense>
        <Formulaire />
      </Suspense>
    </CadreCompte>
  );
}
