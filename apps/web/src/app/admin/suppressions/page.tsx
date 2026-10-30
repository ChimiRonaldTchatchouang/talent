"use client";

import { Button, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { EnTete } from "@/components/admin/communs";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";

interface Demande {
  id: string;
  demandeLe: string;
  candidat: string;
  dossierId: string | null;
}

/** Demandes de suppression (W10) : la validation efface définitivement le dossier et les fichiers. */
export default function Suppressions() {
  const [donnees, setDonnees] = useState<{ traitees: number; demandes: Demande[] } | null>(null);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const charger = useCallback(() => {
    api<{ traitees: number; demandes: Demande[] }>("/admin/suppressions").then(setDonnees).catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  useEffect(charger, [charger]);

  async function valider(id: string) {
    try {
      await api(`/admin/suppressions/${id}/valider`, { methode: "POST" });
      toaster.create({ type: "success", title: "Dossier supprimé. Le candidat est prévenu s'il a un e-mail." });
      setAConfirmer(null);
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  if (!donnees) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="5">
      <EnTete
        titre="Demandes de suppression"
        sousTitre={`La validation efface définitivement le dossier, les documents et le compte. Une trace anonyme de la demande est gardée. ${donnees.traitees} demande(s) déjà traitée(s).`}
      />
      {donnees.demandes.length === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris">Aucune demande en attente.</Text>
        </Carte>
      )}
      {donnees.demandes.map((d) => (
        <Carte key={d.id}>
          <HStack justify="space-between" wrap="wrap" gap="3">
            <Stack gap="0">
              <Text fontWeight="700" color="nuit">
                {d.candidat}
              </Text>
              <Text fontSize="sm" color="gris">
                Demande du {new Date(d.demandeLe).toLocaleDateString("fr-FR")}
                {d.dossierId && (
                  <>
                    {" · "}
                    <Link href={`/admin/candidats/${d.dossierId}`} style={{ textDecoration: "underline" }}>
                      voir le dossier
                    </Link>
                  </>
                )}
              </Text>
            </Stack>
            {aConfirmer === d.id ? (
              <HStack>
                <Text fontSize="sm" fontWeight="600" color="etat.refuseTexte">
                  Suppression définitive. Confirmer ?
                </Text>
                <Button size="sm" variant="ghost" onClick={() => setAConfirmer(null)}>
                  Annuler
                </Button>
                <Button size="sm" bg="etat.refuseTexte" color="white" onClick={() => valider(d.id)}>
                  Oui, supprimer
                </Button>
              </HStack>
            ) : (
              <Button size="sm" variant="outline" color="etat.refuseTexte" onClick={() => setAConfirmer(d.id)}>
                Valider la suppression
              </Button>
            )}
          </HStack>
        </Carte>
      ))}
    </Stack>
  );
}
