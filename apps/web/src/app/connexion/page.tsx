"use client";

import { Alert, Box, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, ErreurClient } from "@/lib/api";
import { ACCUEIL_PAR_ROLE } from "@/lib/session";
import type { UtilisateurPublic } from "@/lib/types";

export default function Connexion() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voir, setVoir] = useState(false);
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
    <CadreCompte
      titre="Connexion"
      sousTitre="Heureux de vous revoir. Saisissez votre e-mail ou votre numéro de téléphone."
      pied={
        <Text>
          Pas encore de compte ? <Lien href="/inscription">Créer mon profil</Lien>
        </Text>
      }
    >
      <form onSubmit={soumettre} noValidate>
        <Stack gap="6">
          {erreur && (
            <Alert.Root status="error" borderRadius="carte">
              <Alert.Indicator />
              <Alert.Title>{erreur}</Alert.Title>
            </Alert.Root>
          )}
          <Field.Root invalid={!!details.identifiant}>
            <Field.Label color="gris" fontWeight="500">
              E-mail ou téléphone
            </Field.Label>
            <Input variant="flushed" size="lg" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" placeholder="exemple@mail.com ou 6 99 12 34 56" />
            <Field.ErrorText>{details.identifiant}</Field.ErrorText>
          </Field.Root>
          <Field.Root invalid={!!details.motDePasse}>
            <Field.Label color="gris" fontWeight="500">
              Mot de passe
            </Field.Label>
            <Box position="relative" w="full">
              <Input variant="flushed" size="lg" type={voir ? "text" : "password"} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" pr="10" />
              <Button position="absolute" right="0" top="50%" transform="translateY(-50%)" variant="ghost" size="sm" aria-label={voir ? "Cacher le mot de passe" : "Afficher le mot de passe"} onClick={() => setVoir(!voir)} _hover={{ transform: "translateY(-50%)", boxShadow: "none", bg: "brume" }} _active={{ transform: "translateY(-50%) scale(0.95)" }}>
                {voir ? <LuEyeOff /> : <LuEye />}
              </Button>
            </Box>
            <Field.ErrorText>{details.motDePasse}</Field.ErrorText>
          </Field.Root>
          <Box textAlign="right" mt="-3" fontSize="sm">
            <Lien href="/mot-de-passe-oublie">Mot de passe oublié ?</Lien>
          </Box>
          <Button type="submit" size="lg" colorPalette="emeraude" borderRadius="full" loading={envoi} loadingText="Connexion…">
            Se connecter
          </Button>
        </Stack>
      </form>
    </CadreCompte>
  );
}
