"use client";

import { LANGUES_PARLEES, LIBELLES_TRANCHES, TRANCHES_EXPERIENCE } from "@bdt/shared";
import { Button, Heading, HStack, Input, NativeSelect, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { CarteProfil } from "@/components/recruteur/carte-profil";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { ProfilAnonyme } from "@/lib/types";

interface Filtres {
  tranches: string[];
  langue: string;
  competence: string;
  testVerifie: boolean;
  diplomeVerifie: boolean;
  passeportValide: boolean;
}
const VIDES: Filtres = { tranches: [], langue: "", competence: "", testVerifie: false, diplomeVerifie: false, passeportValide: false };

export default function Profils() {
  const [filtres, setFiltres] = useState<Filtres>(VIDES);
  const [competence, setCompetence] = useState("");
  const [resultat, setResultat] = useState<{ total: number; profils: ProfilAnonyme[] } | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  const charger = useCallback(() => {
    const q = new URLSearchParams();
    if (filtres.tranches.length) q.set("tranches", filtres.tranches.join(","));
    if (filtres.langue) q.set("langue", filtres.langue);
    if (filtres.competence) q.set("competence", filtres.competence);
    for (const c of ["testVerifie", "diplomeVerifie", "passeportValide"] as const) if (filtres[c]) q.set(c, "true");
    api<{ total: number; profils: ProfilAnonyme[] }>(`/recruteur/profils?${q.toString()}`)
      .then(setResultat)
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, [filtres]);
  useEffect(charger, [charger]);
  useEffect(() => {
    const t = setTimeout(() => setFiltres((f) => (f.competence === competence ? f : { ...f, competence })), 400);
    return () => clearTimeout(t);
  }, [competence]);

  async function basculer(p: ProfilAnonyme) {
    setOccupe(p.id);
    try {
      await api(`/recruteur/selection/profils/${p.id}`, p.dansSelection ? { methode: "DELETE" } : { methode: "PUT", corps: {} });
      setResultat((r) => r && { ...r, profils: r.profils.map((x) => (x.id === p.id ? { ...x, dansSelection: !x.dansSelection } : x)) });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setOccupe(null);
    }
  }

  const puce = (actif: boolean, onClick: () => void, libelle: string) => (
    <Button key={libelle} size="xs" borderRadius="full" colorPalette="emeraude" variant={actif ? "solid" : "outline"} bg={actif ? undefined : "white"} onClick={onClick}>
      {libelle}
    </Button>
  );
  const nbSelection = resultat?.profils.filter((p) => p.dansSelection).length ?? 0;
  const filtresActifs = JSON.stringify(filtres) !== JSON.stringify(VIDES);

  return (
    <Stack gap="6">
      <HStack justify="space-between" wrap="wrap" gap="3">
        <Stack gap="1">
          <Heading as="h1" size="2xl" color="nuit">
            Profils disponibles
          </Heading>
          <Text color="gris">{resultat ? `${resultat.total} profil${resultat.total > 1 ? "s" : ""} correspondant à votre accès.` : "Chargement…"}</Text>
        </Stack>
        <Button asChild colorPalette="emeraude">
          <Link href="/recruteur/selection">Voir ma sélection{nbSelection ? ` (${nbSelection})` : ""}</Link>
        </Button>
      </HStack>

      <Carte>
        <Stack gap="3">
          <HStack gap="2" wrap="wrap">
            <Text fontSize="sm" color="gris" w="28">
              Expérience
            </Text>
            {TRANCHES_EXPERIENCE.map((t) =>
              puce(filtres.tranches.includes(t), () => setFiltres({ ...filtres, tranches: filtres.tranches.includes(t) ? filtres.tranches.filter((x) => x !== t) : [...filtres.tranches, t] }), LIBELLES_TRANCHES[t]),
            )}
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="3">
            <NativeSelect.Root size="sm">
              <NativeSelect.Field bg="brume" value={filtres.langue} onChange={(e) => setFiltres({ ...filtres, langue: e.target.value })}>
                <option value="">Langue : toutes</option>
                {LANGUES_PARLEES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Input size="sm" bg="brume" placeholder="Compétence (ex. maçonnerie)" value={competence} onChange={(e) => setCompetence(e.target.value)} />
            <HStack gap="2" wrap="wrap">
              {puce(filtres.diplomeVerifie, () => setFiltres({ ...filtres, diplomeVerifie: !filtres.diplomeVerifie }), "Diplôme vérifié")}
              {puce(filtres.testVerifie, () => setFiltres({ ...filtres, testVerifie: !filtres.testVerifie }), "Test vérifié")}
              {puce(filtres.passeportValide, () => setFiltres({ ...filtres, passeportValide: !filtres.passeportValide }), "Passeport valide")}
            </HStack>
          </SimpleGrid>
        </Stack>
      </Carte>

      {!resultat && <Spinner color="emeraude.600" />}
      {resultat && resultat.total === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris" mb="4">
            Aucun profil ne correspond à ces critères.
          </Text>
          {filtresActifs && (
            <Button
              colorPalette="emeraude"
              onClick={() => {
                setCompetence("");
                setFiltres(VIDES);
              }}
            >
              Effacer les filtres
            </Button>
          )}
        </Carte>
      )}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
        {resultat?.profils.map((p) => (
          <CarteProfil key={p.id} p={p} occupe={occupe === p.id} onBasculer={() => basculer(p)} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
