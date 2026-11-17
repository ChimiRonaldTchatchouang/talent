"use client";

import { Alert, Box, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, ErreurClient } from "@/lib/api";
import { useLangue } from "@/lib/preferences";
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
  const { tr } = useLangue();

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
      } else setErreur(tr("Une erreur inattendue est survenue.", "An unexpected error occurred."));
      setEnvoi(false);
    }
  }

  return (
    <CadreCompte
      titre={tr("Connexion", "Log in")}
      sousTitre={tr("Heureux de vous revoir. Saisissez votre e-mail ou votre numéro de téléphone.", "Good to see you again. Enter your email or phone number.")}
      pied={
        <Text>
          {tr("Pas encore de compte ?", "No account yet?")} <Lien href="/inscription">{tr("Créer mon profil", "Create my profile")}</Lien>
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
              {tr("E-mail ou téléphone", "Email or phone")}
            </Field.Label>
            <Input variant="flushed" size="lg" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" placeholder={tr("exemple@mail.com ou 6 99 12 34 56", "example@mail.com or 6 99 12 34 56")} />
            <Field.ErrorText>{details.identifiant}</Field.ErrorText>
          </Field.Root>
          <Field.Root invalid={!!details.motDePasse}>
            <Field.Label color="gris" fontWeight="500">
              {tr("Mot de passe", "Password")}
            </Field.Label>
            <Box position="relative" w="full">
              <Input variant="flushed" size="lg" type={voir ? "text" : "password"} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" pr="10" />
              <Button position="absolute" right="0" top="50%" transform="translateY(-50%)" variant="ghost" size="sm" aria-label={voir ? tr("Cacher le mot de passe", "Hide password") : tr("Afficher le mot de passe", "Show password")} onClick={() => setVoir(!voir)} _hover={{ transform: "translateY(-50%)", boxShadow: "none", bg: "brume" }} _active={{ transform: "translateY(-50%) scale(0.95)" }}>
                {voir ? <LuEyeOff /> : <LuEye />}
              </Button>
            </Box>
            <Field.ErrorText>{details.motDePasse}</Field.ErrorText>
          </Field.Root>
          <Box textAlign="right" mt="-3" fontSize="sm">
            <Lien href="/mot-de-passe-oublie">{tr("Mot de passe oublié ?", "Forgot your password?")}</Lien>
          </Box>
          <Button type="submit" size="lg" colorPalette="emeraude" borderRadius="full" loading={envoi} loadingText={tr("Connexion…", "Logging in…")}>
            {tr("Se connecter", "Log in")}
          </Button>
        </Stack>
      </form>
    </CadreCompte>
  );
}
