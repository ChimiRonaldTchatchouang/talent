"use client";

import {
  ETATS_JUSTIFICATIFS,
  GRADES,
  LANGUES_PARLEES,
  LIBELLES_ETATS_JUSTIFICATIFS,
  LIBELLES_GRADES,
  LIBELLES_TRANCHES,
  TRANCHES_EXPERIENCE,
} from "@bdt/shared";
import { Box, Button, Grid, HStack, Input, NativeSelect, SimpleGrid, Spinner, Stack, Table, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LuColumns3, LuDownload, LuList, LuSearch, LuX } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { CarteCandidat, EnTete, EtatGrade, libelleGrade, TitreGrade } from "@/components/admin/communs";
import { api, messageErreur } from "@/lib/api";
import type { ListesReference, ResumeCandidat } from "@/lib/types";

const CLES = ["grades", "etatGrade", "alerte", "domaineId", "competenceIds", "ville", "langue", "testValide", "passeportValide", "tranches", "justificatifs", "q"] as const;

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="xs" borderRadius="full" variant={actif ? "solid" : "outline"} colorPalette="emeraude" onClick={onClick} aria-pressed={actif}>
      {children}
    </Button>
  );
}

function Selection({ valeur, onChange, options, vide }: { valeur: string; onChange: (v: string) => void; options: { v: string; l: string }[]; vide: string }) {
  return (
    <NativeSelect.Root size="sm">
      <NativeSelect.Field bg="brume" value={valeur} onChange={(e) => onChange(e.target.value)}>
        <option value="">{vide}</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

function Vivier() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [listes, setListes] = useState<ListesReference | null>(null);
  const [resultat, setResultat] = useState<{ total: number; candidats: ResumeCandidat[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState(params.get("q") ?? "");
  const vue = params.get("vue") === "liste" ? "liste" : "colonnes";

  const filtres = useMemo(() => {
    const f = new URLSearchParams();
    for (const c of CLES) {
      const v = params.get(c);
      if (v) f.set(c, v);
    }
    return f;
  }, [params]);
  const nbFiltres = [...filtres.keys()].length;

  useEffect(() => {
    api<ListesReference>("/referentiels").then(setListes).catch(() => undefined);
  }, []);

  useEffect(() => {
    setResultat(null);
    api<{ total: number; candidats: ResumeCandidat[] }>(`/admin/vivier?tout=true&${filtres.toString()}`)
      .then(setResultat)
      .catch((e) => setErreur(messageErreur(e)));
  }, [filtres]);

  // La recherche texte est appliquée après une courte pause de frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== recherche) maj("q", recherche);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  function maj(cle: string, valeur: string | null) {
    const p = new URLSearchParams(params.toString());
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    if (cle === "domaineId") p.delete("competenceIds");
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  }
  const multiple = (cle: string) => (params.get(cle) ?? "").split(",").filter(Boolean);
  const basculer = (cle: string, v: string) => {
    const l = multiple(cle);
    maj(cle, (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]).join(",") || null);
  };
  function effacer() {
    setRecherche("");
    router.replace(vue === "liste" ? `${chemin}?vue=liste` : chemin, { scroll: false });
  }

  const domaineId = params.get("domaineId") ?? "";
  const competences = listes?.competences.filter((c) => c.domaineId === domaineId) ?? [];

  return (
    <Stack gap="5">
      <EnTete
        titre="Vivier"
        sousTitre={resultat ? `${resultat.total} profil${resultat.total > 1 ? "s" : ""} (dossiers envoyés)` : "Chargement…"}
        actions={
          <>
            <HStack bg="white" borderRadius="carte" p="1" boxShadow="carte">
              <Button size="sm" variant={vue === "colonnes" ? "solid" : "ghost"} colorPalette="emeraude" onClick={() => maj("vue", null)}>
                <LuColumns3 /> Colonnes
              </Button>
              <Button size="sm" variant={vue === "liste" ? "solid" : "ghost"} colorPalette="emeraude" onClick={() => maj("vue", "liste")}>
                <LuList /> Liste
              </Button>
            </HStack>
            <Button asChild size="sm" variant="outline" colorPalette="emeraude" bg="white">
              <a href={`/api/admin/vivier/export?${filtres.toString()}`}>
                <LuDownload /> Exporter (Excel)
              </a>
            </Button>
          </>
        }
      />

      <Carte>
        <Stack gap="4">
          <HStack gap="2">
            <Box position="relative" flex="1">
              <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gris" zIndex="1" pointerEvents="none">
                <LuSearch />
              </Box>
              <Input pl="9" bg="brume" placeholder="Rechercher par nom ou téléphone" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </Box>
            {nbFiltres > 0 && (
              <Button variant="ghost" onClick={effacer}>
                <LuX /> Effacer les filtres
              </Button>
            )}
          </HStack>
          <HStack gap="2" wrap="wrap">
            <Text fontSize="sm" color="gris" w="24">
              Grade
            </Text>
            {GRADES.map((g) => (
              <Puce key={g} actif={multiple("grades").includes(g)} onClick={() => basculer("grades", g)}>
                {g === "HORS_BASSIN" ? "Hors bassin" : g}
              </Puce>
            ))}
          </HStack>
          <HStack gap="2" wrap="wrap">
            <Text fontSize="sm" color="gris" w="24">
              Expérience
            </Text>
            {TRANCHES_EXPERIENCE.map((t) => (
              <Puce key={t} actif={multiple("tranches").includes(t)} onClick={() => basculer("tranches", t)}>
                {LIBELLES_TRANCHES[t]}
              </Puce>
            ))}
          </HStack>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="3">
            <Selection
              valeur={params.get("etatGrade") ?? ""}
              onChange={(v) => maj("etatGrade", v)}
              vide="État du grade : tous"
              options={[
                { v: "PROVISOIRE", l: "Provisoire" },
                { v: "CONFIRME", l: "Confirmé" },
                { v: "CORRIGE", l: "Corrigé" },
              ]}
            />
            <Selection valeur={domaineId} onChange={(v) => maj("domaineId", v)} vide="Domaine : tous" options={(listes?.domaines ?? []).map((d) => ({ v: d.id, l: d.nom }))} />
            <Selection valeur={params.get("langue") ?? ""} onChange={(v) => maj("langue", v)} vide="Langue : toutes" options={LANGUES_PARLEES.map((l) => ({ v: l, l }))} />
            <Selection
              valeur={params.get("justificatifs") ?? ""}
              onChange={(v) => maj("justificatifs", v)}
              vide="Justificatifs : tous"
              options={ETATS_JUSTIFICATIFS.map((e) => ({ v: e, l: LIBELLES_ETATS_JUSTIFICATIFS[e] }))}
            />
            <Input size="sm" bg="brume" placeholder="Ville" defaultValue={params.get("ville") ?? ""} onBlur={(e) => maj("ville", e.target.value.trim() || null)} />
            <HStack gap="2" wrap="wrap" gridColumn={{ lg: "span 3" }}>
              <Puce actif={params.get("passeportValide") === "true"} onClick={() => maj("passeportValide", params.get("passeportValide") ? null : "true")}>
                Passeport valide
              </Puce>
              <Puce actif={params.get("testValide") === "true"} onClick={() => maj("testValide", params.get("testValide") ? null : "true")}>
                Test de langue validé
              </Puce>
              <Puce actif={params.get("alerte") === "true"} onClick={() => maj("alerte", params.get("alerte") ? null : "true")}>
                Grade à revoir
              </Puce>
            </HStack>
          </SimpleGrid>
          {domaineId && competences.length > 0 && (
            <HStack gap="2" wrap="wrap">
              <Text fontSize="sm" color="gris" w="24">
                Compétences
              </Text>
              {competences.map((c) => (
                <Puce key={c.id} actif={multiple("competenceIds").includes(c.id)} onClick={() => basculer("competenceIds", c.id)}>
                  {c.nom}
                </Puce>
              ))}
            </HStack>
          )}
        </Stack>
      </Carte>

      {erreur && <Text color="etat.refuseTexte">{erreur}</Text>}
      {!resultat && !erreur && <Spinner color="emeraude.600" />}
      {resultat && resultat.total === 0 && (
        <Carte textAlign="center" py="10">
          <Text color="gris" mb="4">
            Aucun profil ne correspond à ces critères.
          </Text>
          <Button colorPalette="emeraude" onClick={effacer}>
            Effacer les filtres
          </Button>
        </Carte>
      )}

      {resultat && resultat.total > 0 && vue === "colonnes" && (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(5, minmax(0, 1fr))" }} gap="4" alignItems="start">
          {GRADES.map((g) => {
            const colonne = resultat.candidats.filter((c) => c.grade === g);
            return (
              <Stack key={g} gap="2" bg="brume" borderRadius="20px" p="3" borderTopWidth="4px" borderTopColor={`grade.${g === "HORS_BASSIN" ? "hors" : g}`}>
                <TitreGrade grade={g} nombre={colonne.length} />
                {colonne.map((c) => (
                  <CarteCandidat key={c.id} c={c} />
                ))}
                {colonne.length === 0 && (
                  <Text fontSize="sm" color="gris" textAlign="center" py="4">
                    Aucun profil
                  </Text>
                )}
              </Stack>
            );
          })}
        </Grid>
      )}

      {resultat && resultat.total > 0 && vue === "liste" && (
        <Carte p="0" overflow="hidden">
          <Table.ScrollArea>
            <Table.Root size="sm" interactive>
              <Table.Header>
                <Table.Row bg="brume">
                  <Table.ColumnHeader>Candidat</Table.ColumnHeader>
                  <Table.ColumnHeader>Grade</Table.ColumnHeader>
                  <Table.ColumnHeader>Métier</Table.ColumnHeader>
                  <Table.ColumnHeader>Ville</Table.ColumnHeader>
                  <Table.ColumnHeader>Ce qui manque</Table.ColumnHeader>
                  <Table.ColumnHeader>Pièces</Table.ColumnHeader>
                  <Table.ColumnHeader>Envoyé le</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {resultat.candidats.map((c) => (
                  <Table.Row key={c.id} cursor="pointer" onClick={() => router.push(`/admin/candidats/${c.id}`)}>
                    <Table.Cell>
                      <Link href={`/admin/candidats/${c.id}`}>
                        <Text fontWeight="600" color="nuit">
                          {c.nomComplet}
                        </Text>
                        <Text fontSize="xs" color="gris">
                          {c.telephone}
                        </Text>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap="2">
                        {c.grade && <PastilleGrade grade={c.grade} taille="sm" />}
                        <Stack gap="1">
                          <Text fontSize="sm">{c.grade ? LIBELLES_GRADES[c.grade].libelle : libelleGrade(c.grade)}</Text>
                          <EtatGrade etat={c.etatGrade} alerte={c.alerte} />
                        </Stack>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>{[c.metier, c.domaine].filter(Boolean).join(" · ") || "—"}</Table.Cell>
                    <Table.Cell>{c.ville ?? "—"}</Table.Cell>
                    <Table.Cell fontSize="sm">{c.manques.join(", ") || "Rien"}</Table.Cell>
                    <Table.Cell fontSize="sm">
                      {c.piecesManquantes > 0 && <Text color="gris">{c.piecesManquantes} manquante(s)</Text>}
                      {c.piecesAVerifier > 0 && <Text color="emeraude.700">{c.piecesAVerifier} à vérifier</Text>}
                      {c.piecesManquantes === 0 && c.piecesAVerifier === 0 && "Complètes"}
                    </Table.Cell>
                    <Table.Cell fontSize="sm">{c.envoyeLe ? new Date(c.envoyeLe).toLocaleDateString("fr-FR") : "—"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Carte>
      )}
    </Stack>
  );
}

export default function PageVivier() {
  return (
    <Suspense>
      <Vivier />
    </Suspense>
  );
}
