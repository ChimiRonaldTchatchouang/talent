"use client";

import { Box, Grid, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { DecisionPiece } from "@/components/admin/decision-piece";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";

interface PieceAVerifier {
  id: string;
  libelle: string;
  nomFichier: string;
  typeMime: string;
  deposeLe: string;
  refusPrecedents: { motif: string | null; le: string }[];
  dossierId: string;
  candidat: string;
  declare: [string, string | null][];
}

/** Aperçu du document dans la page (lien temporaire). */
function Apercu({ id, typeMime }: { id: string; typeMime: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    api<{ chemin: string; url: string | null }>(`/admin/pieces/${id}/lien`)
      .then((r) => setUrl(r.url ?? `/api${r.chemin}`))
      .catch(() => setUrl(null));
  }, [id]);
  if (!url) return <Spinner color="emeraude.600" />;
  return typeMime === "application/pdf" ? (
    <Box as="iframe" title="Document" w="full" h="420px" borderRadius="carte" bg="brume" {...{ src: url }} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Document déposé" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 12, background: "#EEF2FB" }} />
  );
}

export default function Verifications() {
  const [pieces, setPieces] = useState<PieceAVerifier[] | null>(null);
  const charger = useCallback(() => {
    api<{ pieces: PieceAVerifier[] }>("/admin/pieces")
      .then((r) => setPieces(r.pieces))
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  useEffect(charger, [charger]);

  if (!pieces) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="5">
      <EnTete titre="Pièces à vérifier" sousTitre={`${pieces.length} pièce${pieces.length > 1 ? "s" : ""} en attente, de la plus ancienne à la plus récente.`} />
      {pieces.length === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris">Toutes les pièces sont vérifiées. Bravo !</Text>
        </Carte>
      )}
      {pieces.map((p) => (
        <Carte key={p.id}>
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap="5">
            <Apercu id={p.id} typeMime={p.typeMime} />
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" color="gris">
                  <Link href={`/admin/candidats/${p.dossierId}`} style={{ textDecoration: "underline" }}>
                    {p.candidat}
                  </Link>{" "}
                  · déposée le {new Date(p.deposeLe).toLocaleDateString("fr-FR")}
                </Text>
                <Text fontSize="xl" fontWeight="700" color="nuit">
                  {p.libelle}
                </Text>
              </Box>
              <Box bg="brume" borderRadius="carte" p="4">
                <Text fontWeight="600" color="nuit" mb="2">
                  Ce que le candidat a déclaré
                </Text>
                <Stack gap="1">
                  {p.declare.map(([l, v], i) => (
                    <HStack key={i} justify="space-between" fontSize="sm" gap="4">
                      <Text color="gris">{l}</Text>
                      <Text textAlign="right">{v ?? "—"}</Text>
                    </HStack>
                  ))}
                </Stack>
              </Box>
              {p.refusPrecedents.length > 0 && (
                <Box fontSize="sm" color="etat.refuseTexte">
                  {p.refusPrecedents.map((r, i) => (
                    <Text key={i}>
                      Déjà refusée le {new Date(r.le).toLocaleDateString("fr-FR")} : {r.motif}
                    </Text>
                  ))}
                </Box>
              )}
              <DecisionPiece id={p.id} onFait={charger} />
            </Stack>
          </Grid>
        </Carte>
      ))}
    </Stack>
  );
}
