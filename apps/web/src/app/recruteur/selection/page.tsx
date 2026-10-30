"use client";

import { Alert, Box, Button, Heading, HStack, Spinner, Stack, Text, Textarea } from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { SelectionRecruteur } from "@/lib/types";

export default function MaSelection() {
  const [s, setS] = useState<SelectionRecruteur | null>(null);
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const appliquer = (r: SelectionRecruteur) => {
    setS(r);
    setMessage(r.message);
    setCommentaires(Object.fromEntries(r.lignes.map((l) => [l.profil.id, l.commentaire])));
  };
  useEffect(() => {
    api<SelectionRecruteur>("/recruteur/selection").then(appliquer).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);

  async function appel(chemin: string, options: Parameters<typeof api>[1], succes?: string) {
    try {
      appliquer(await api<SelectionRecruteur>(chemin, options));
      if (succes) toaster.create({ type: "success", title: succes });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function envoyer() {
    setEnvoi(true);
    await appel("/recruteur/selection", { methode: "PUT", corps: { message } });
    for (const l of s!.lignes) {
      if ((commentaires[l.profil.id] ?? "") !== l.commentaire) {
        await appel(`/recruteur/selection/profils/${l.profil.id}`, { methode: "PUT", corps: { commentaire: commentaires[l.profil.id] ?? "" } });
      }
    }
    await appel("/recruteur/selection/envoyer", { methode: "POST" }, "Sélection envoyée au cabinet. Merci !");
    setEnvoi(false);
  }

  if (!s) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="5" maxW="4xl">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          Ma sélection
        </Heading>
        <Text color="gris">
          {s.dernierEnvoi
            ? `Dernier envoi le ${new Date(s.dernierEnvoi).toLocaleString("fr-FR")}. Un nouvel envoi remplacera le précédent.`
            : "Ajoutez des profils, commentez-les, puis envoyez votre sélection au cabinet."}
        </Text>
      </Stack>
      {s.retires && (
        <Alert.Root status="info" borderRadius="carte">
          <Alert.Indicator />
          <Alert.Title>{s.retires}</Alert.Title>
        </Alert.Root>
      )}
      {s.lignes.length === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris" mb="4">
            Votre sélection est vide.
          </Text>
          <Button asChild colorPalette="emeraude">
            <Link href="/recruteur">Parcourir les profils</Link>
          </Button>
        </Carte>
      )}
      {s.lignes.map(({ profil: p }) => (
        <Carte key={p.id}>
          <HStack justify="space-between" align="flex-start" gap="3" mb="3">
            <HStack gap="3">
              {p.grade && <PastilleGrade grade={p.grade} taille="sm" />}
              <Box>
                <Link href={`/recruteur/profils/${p.id}`}>
                  <Text fontWeight="700" color="nuit">
                    {p.nom}
                  </Text>
                </Link>
                <Text fontSize="sm" color="gris">
                  {[p.metier, p.domaine, p.experience].filter(Boolean).join(" · ")}
                </Text>
              </Box>
            </HStack>
            <Button size="xs" variant="ghost" onClick={() => appel(`/recruteur/selection/profils/${p.id}`, { methode: "DELETE" })}>
              Retirer
            </Button>
          </HStack>
          <Textarea
            size="sm"
            bg="brume"
            placeholder="Votre commentaire sur ce profil (facultatif)"
            value={commentaires[p.id] ?? ""}
            onChange={(e) => setCommentaires({ ...commentaires, [p.id]: e.target.value })}
          />
        </Carte>
      ))}
      {s.lignes.length > 0 && (
        <Carte bg="brume" boxShadow="none">
          <Text fontWeight="600" mb="2">
            Message au cabinet
          </Text>
          <Textarea bg="white" size="sm" mb="4" placeholder="Ex. : postes à pourvoir, dates d'entretien…" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button size="lg" colorPalette="emeraude" loading={envoi} onClick={envoyer}>
            Envoyer ma sélection ({s.lignes.length} profil{s.lignes.length > 1 ? "s" : ""})
          </Button>
        </Carte>
      )}
    </Stack>
  );
}
