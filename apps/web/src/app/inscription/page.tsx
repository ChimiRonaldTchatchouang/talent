"use client";

import { MARQUE } from "@bdt/shared";
import { Alert, Box, Button, Checkbox, Field, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, ErreurClient } from "@/lib/api";

export default function Inscription() {
  const router = useRouter();
  const [parTelephone, setParTelephone] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voir, setVoir] = useState(false);
  const [traitement, setTraitement] = useState(false);
  const [recruteurs, setRecruteurs] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setDetails({});
    if (!traitement) {
      setDetails({
        consentementTraitement: "Sans ton accord, nous ne pouvons ni calculer ton grade ni t'accompagner. Coche la case pour continuer.",
      });
      return;
    }
    setEnvoi(true);
    try {
      await api("/auth/inscription", {
        methode: "POST",
        corps: { identifiant, motDePasse, consentementTraitement: traitement, consentementRecruteurs: recruteurs },
      });
      router.replace("/candidat");
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
      titre="Créer mon profil"
      sousTitre="Deux minutes pour créer ton compte. Ensuite, tu remplis ton dossier à ton rythme."
      pied={
        <Text>
          Tu as déjà un compte ? <Lien href="/connexion">Se connecter</Lien>
        </Text>
      }
    >
      <form onSubmit={soumettre} noValidate>
        <Stack gap="5">
          {erreur && (
            <Alert.Root status="error" borderRadius="carte">
              <Alert.Indicator />
              <Alert.Title>{erreur}</Alert.Title>
            </Alert.Root>
          )}

          <Field.Root invalid={!!details.identifiant}>
            <Field.Label color="gris" fontWeight="500">{parTelephone ? "Ton numéro de téléphone" : "Ton adresse e-mail"}</Field.Label>
            <Input
              variant="flushed"
              size="lg"
              type={parTelephone ? "tel" : "email"}
              inputMode={parTelephone ? "tel" : "email"}
              autoComplete={parTelephone ? "tel" : "email"}
              placeholder={parTelephone ? "6 99 12 34 56" : "exemple@gmail.com"}
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
            />
            <Field.ErrorText>{details.identifiant}</Field.ErrorText>
            <Field.HelperText>
              {parTelephone
                ? "Indicatif +237 ajouté automatiquement. Sans e-mail, en cas d'oubli du mot de passe, tu devras contacter le cabinet."
                : "Tu y recevras un lien pour confirmer ton adresse."}
            </Field.HelperText>
          </Field.Root>
          <Button
            variant="plain"
            color="emeraude.600"
            size="sm"
            alignSelf="flex-start"
            px="0"
            mt="-3"
            onClick={() => {
              setParTelephone(!parTelephone);
              setIdentifiant("");
            }}
          >
            {parTelephone ? "Utiliser plutôt mon e-mail" : "Je n'ai pas d'e-mail : utiliser mon numéro de téléphone"}
          </Button>

          <Field.Root invalid={!!details.motDePasse}>
            <Field.Label color="gris" fontWeight="500">Choisis un mot de passe</Field.Label>
            <Box position="relative" w="full">
              <Input
                variant="flushed"
                size="lg"
                type={voir ? "text" : "password"}
                autoComplete="new-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                pr="12"
              />
              <Button
                position="absolute"
                right="0"
                top="50%"
                transform="translateY(-50%)"
                variant="ghost"
                size="sm"
                aria-label={voir ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setVoir(!voir)}
                _hover={{ transform: "translateY(-50%)", boxShadow: "none", bg: "brume" }}
                _active={{ transform: "translateY(-50%) scale(0.95)" }}
              >
                {voir ? <LuEyeOff /> : <LuEye />}
              </Button>
            </Box>
            <Field.ErrorText>{details.motDePasse}</Field.ErrorText>
            <Field.HelperText>8 caractères minimum.</Field.HelperText>
          </Field.Root>

          <Stack gap="4" bg="brume" borderRadius="carte" p="4">
            <Text fontWeight="600" color="nuit">
              Tes données personnelles
            </Text>
            <Field.Root invalid={!!details.consentementTraitement}>
              <Checkbox.Root colorPalette="emeraude" checked={traitement} onCheckedChange={(e) => setTraitement(!!e.checked)} alignItems="flex-start">
                <Checkbox.HiddenInput />
                <Checkbox.Control mt="1" bg="white" />
                <Checkbox.Label fontWeight="400">
                  <strong>Obligatoire.</strong> J&apos;accepte que {MARQUE.nom} utilise mes informations pour calculer mon
                  grade et m&apos;accompagner.
                </Checkbox.Label>
              </Checkbox.Root>
              <Field.ErrorText>{details.consentementTraitement}</Field.ErrorText>
            </Field.Root>
            <Checkbox.Root colorPalette="emeraude" checked={recruteurs} onCheckedChange={(e) => setRecruteurs(!!e.checked)} alignItems="flex-start">
              <Checkbox.HiddenInput />
              <Checkbox.Control mt="1" bg="white" />
              <Checkbox.Label fontWeight="400">
                <strong>Facultatif.</strong> J&apos;accepte que mon profil soit présenté à des recruteurs, sans mes
                coordonnées (pas de téléphone, d&apos;e-mail ni de documents).
              </Checkbox.Label>
            </Checkbox.Root>
            <Text fontSize="sm" color="gris">
              Tu pourras changer d&apos;avis à tout moment depuis ton espace, ou demander la suppression de ton dossier.
            </Text>
          </Stack>

          <Button type="submit" size="lg" colorPalette="emeraude" borderRadius="full" loading={envoi} loadingText="Création…">
            Créer mon compte
          </Button>
        </Stack>
      </form>
    </CadreCompte>
  );
}
