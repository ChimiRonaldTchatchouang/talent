"use client";

import { Box, Button, Field, HStack, Input, NativeSelect, Stack, Table, Text } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";
import { BadgeEtat } from "@/components/badges";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";

export interface Champ {
  cle: string;
  libelle: string;
  type: "texte" | "nombre" | "liste";
  options?: { valeur: string; libelle: string }[];
  /** Champ facultatif : vide = null. */
  facultatif?: boolean;
  largeur?: string;
}

type Element = { id: string; actif: boolean };
type Valeurs = Record<string, string>;

function lire(e: Element, cle: string): unknown {
  return (e as unknown as Record<string, unknown>)[cle];
}

function versValeurs(champs: Champ[], e?: Element): Valeurs {
  return Object.fromEntries(
    champs.map((c) => {
      const v = e ? lire(e, c.cle) : null;
      return [c.cle, v == null ? "" : String(v)];
    }),
  );
}

function versCorps(champs: Champ[], v: Valeurs): Record<string, unknown> {
  return Object.fromEntries(
    champs.map((c) => {
      const brut = v[c.cle]?.trim() ?? "";
      if (brut === "" && c.facultatif) return [c.cle, null];
      return [c.cle, c.type === "nombre" ? Number(brut.replace(",", ".")) : brut];
    }),
  );
}

function Saisie({ champ, valeur, onChange }: { champ: Champ; valeur: string; onChange: (v: string) => void }) {
  if (champ.type === "liste") {
    return (
      <NativeSelect.Root size="sm">
        <NativeSelect.Field value={valeur} onChange={(e) => onChange(e.target.value)} bg="brume" aria-label={champ.libelle}>
          {champ.facultatif && <option value="">Aucun</option>}
          {!champ.facultatif && valeur === "" && <option value="">Choisir…</option>}
          {champ.options?.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    );
  }
  return (
    <Input
      size="sm"
      bg="brume"
      value={valeur}
      inputMode={champ.type === "nombre" ? "decimal" : undefined}
      onChange={(e) => onChange(e.target.value)}
      aria-label={champ.libelle}
    />
  );
}

function afficher(champ: Champ, valeur: unknown): string {
  if (valeur == null || valeur === "") return "—";
  if (champ.type === "liste") return champ.options?.find((o) => o.valeur === valeur)?.libelle ?? String(valeur);
  return String(valeur);
}

/** Tableau d'une liste de référence : ajouter, modifier, désactiver ou réactiver. */
export function ListeReference({
  chemin,
  champs,
  elements,
  onChange,
  libelleAjout,
}: {
  chemin: string;
  champs: Champ[];
  elements: Element[];
  onChange: () => void;
  libelleAjout: string;
}) {
  const [nouveau, setNouveau] = useState<Valeurs>(versValeurs(champs));
  const [erreursAjout, setErreursAjout] = useState<Record<string, string>>({});
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [edition, setEdition] = useState<Valeurs>({});
  const [occupe, setOccupe] = useState(false);

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    setOccupe(true);
    setErreursAjout({});
    try {
      await api(`/admin/referentiels/${chemin}`, { methode: "POST", corps: versCorps(champs, nouveau) });
      setNouveau(versValeurs(champs));
      toaster.create({ type: "success", title: "Élément ajouté." });
      onChange();
    } catch (err) {
      if (err instanceof ErreurClient && err.details) setErreursAjout(err.details);
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setOccupe(false);
    }
  }

  async function modifier(id: string, corps: Record<string, unknown>, message: string) {
    setOccupe(true);
    try {
      await api(`/admin/referentiels/${chemin}/${id}`, { methode: "PATCH", corps });
      toaster.create({ type: "success", title: message });
      setEnEdition(null);
      onChange();
    } catch (err) {
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Stack gap="5">
      <Box as="form" onSubmit={ajouter} bg="brume" borderRadius="carte" p="4">
        <Text fontWeight="600" color="nuit" mb="3">
          {libelleAjout}
        </Text>
        <Stack direction={{ base: "column", md: "row" }} gap="3" align={{ md: "flex-end" }}>
          {champs.map((c) => (
            <Field.Root key={c.cle} invalid={!!erreursAjout[c.cle]} flex={c.largeur ?? "1"}>
              <Field.Label fontSize="sm">
                {c.libelle}
                {c.facultatif && (
                  <Text as="span" color="gris" fontWeight="400">
                    {" "}
                    (facultatif)
                  </Text>
                )}
              </Field.Label>
              <Box w="full" bg="white" borderRadius="md">
                <Saisie champ={c} valeur={nouveau[c.cle] ?? ""} onChange={(v) => setNouveau({ ...nouveau, [c.cle]: v })} />
              </Box>
              <Field.ErrorText>{erreursAjout[c.cle]}</Field.ErrorText>
            </Field.Root>
          ))}
          <Button type="submit" colorPalette="emeraude" size="sm" loading={occupe} flexShrink={0}>
            Ajouter
          </Button>
        </Stack>
      </Box>

      <Table.ScrollArea>
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              {champs.map((c) => (
                <Table.ColumnHeader key={c.cle}>{c.libelle}</Table.ColumnHeader>
              ))}
              <Table.ColumnHeader>État</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {elements.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={champs.length + 2}>
                  <Text color="gris" py="4" textAlign="center">
                    Aucun élément pour le moment.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
            {elements.map((el) => (
              <Table.Row key={el.id} opacity={el.actif ? 1 : 0.6}>
                {champs.map((c) => (
                  <Table.Cell key={c.cle} minW="140px">
                    {enEdition === el.id ? (
                      <Saisie champ={c} valeur={edition[c.cle] ?? ""} onChange={(v) => setEdition({ ...edition, [c.cle]: v })} />
                    ) : (
                      afficher(c, lire(el, c.cle))
                    )}
                  </Table.Cell>
                ))}
                <Table.Cell>
                  <BadgeEtat etat={el.actif ? "ACTIF" : "DESACTIVE"} />
                </Table.Cell>
                <Table.Cell>
                  <HStack justify="flex-end" gap="2">
                    {enEdition === el.id ? (
                      <>
                        <Button size="xs" variant="ghost" onClick={() => setEnEdition(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="emeraude"
                          loading={occupe}
                          onClick={() => modifier(el.id, versCorps(champs, edition), "Modification enregistrée.")}
                        >
                          Enregistrer
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEnEdition(el.id);
                            setEdition(versValeurs(champs, el));
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            modifier(
                              el.id,
                              { actif: !el.actif },
                              el.actif ? "Élément désactivé : il n'est plus proposé aux candidats." : "Élément réactivé.",
                            )
                          }
                        >
                          {el.actif ? "Désactiver" : "Réactiver"}
                        </Button>
                      </>
                    )}
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </Stack>
  );
}
