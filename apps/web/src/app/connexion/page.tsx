"use client";

import { Alert, Box, Button, Field, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Lien } from "@/components/cadre-compte";
import { Carte } from "@/components/carte";
import { Logo } from "@/components/marque";
import { api, ErreurClient } from "@/lib/api";
import { ACCUEIL_PAR_ROLE } from "@/lib/session";
import type { UtilisateurPublic } from "@/lib/types";

export default function Connexion() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setDetails({});
    setEnvoi(true);
    try {
      const { utilisateur } = await api<{ utilisateur: UtilisateurPublic }>("/auth/connexion", {
        methode: "POST",
        corps: { identifiant, motDePasse },
      });
      router.replace(ACCUEIL_PAR_ROLE[utilisateur.role]);
    } catch (err) {
      if (err instanceof ErreurClient) {
        setErreur(err.message);
        setDetails(err.details ?? {});
      } else setErreur("Une erreur inattendue est survenue.");
      setEnvoi(false);
    }
  }

  return (
    <Box minH="100dvh" display="grid" placeItems="center" px="4" py="10" bg="fond">
      <Stack w="full" maxW="md" gap="6">
        <Box alignSelf="center">
          <Logo />
        </Box>
        <Carte as="main">
          <form onSubmit={soumettre} noValidate>
            <Stack gap="5">
              <Stack gap="1">
                <Heading as="h1" size="xl" color="nuit">
                  Connexion
                </Heading>
                <Text color="gris">Saisissez votre e-mail ou votre numéro de téléphone.</Text>
              </Stack>

              {erreur && (
                <Alert.Root status="error" borderRadius="carte">
                  <Alert.Indicator />
                  <Alert.Title>{erreur}</Alert.Title>
                </Alert.Root>
              )}

              <Field.Root invalid={!!details.identifiant}>
                <Field.Label>E-mail ou téléphone</Field.Label>
                <Input
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  autoComplete="username"
                  placeholder="exemple@mail.com ou 6 99 12 34 56"
                  bg="brume"
                  size="lg"
                />
                <Field.ErrorText>{details.identifiant}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={!!details.motDePasse}>
                <Field.Label>Mot de passe</Field.Label>
                <Input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="current-password"
                  bg="brume"
                  size="lg"
                />
                <Field.ErrorText>{details.motDePasse}</Field.ErrorText>
              </Field.Root>

              <Button type="submit" size="lg" colorPalette="emeraude" loading={envoi} loadingText="Connexion…">
                Se connecter
              </Button>
              <Lien href="/mot-de-passe-oublie">Mot de passe oublié ?</Lien>
            </Stack>
          </form>
        </Carte>
        <Text textAlign="center" color="gris">
          Pas encore de compte ? <Lien href="/inscription">Créer mon profil</Lien>
        </Text>
      </Stack>
    </Box>
  );
}
