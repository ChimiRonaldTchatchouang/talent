"use client";

import { GRADES_OFFRE, LIBELLES_GRADES, type GradeOffre } from "@bdt/shared";
import { Badge, Box, Button, Field, HStack, Input, NativeSelect, SimpleGrid, Spinner, Stack, Switch, Text, Textarea } from "@chakra-ui/react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { LuEye, LuEyeOff, LuGlobe, LuPencil, LuPlus, LuTrash2, LuUsers } from "react-icons/lu";
import { PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { EnTete, EtatGrade } from "@/components/admin/communs";
import { BoutonWhatsApp } from "@/components/admin/whatsapp";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import type { Domaine } from "@/lib/types";

interface Offre {
  id: string;
  titre: string;
  pays: string;
  ville: string | null;
  domaine: string | null;
  typeContrat: string | null;
  description: string;
  gradeRequis: GradeOffre;
  dateLimite: string | null;
  publiee: boolean;
  interesses: number;
  creeLe: string;
}
interface Interesse {
  dossierId: string;
  nom: string;
  metier: string | null;
  telephone: string | null;
  grade: GradeOffre | "HORS_BASSIN" | null;
  etatGrade: "PROVISOIRE" | "CONFIRME" | "CORRIGE" | null;
  le: string;
}

const VIDE = { titre: "", pays: "", ville: "", domaine: "", typeContrat: "", description: "", gradeRequis: "B" as GradeOffre, dateLimite: "", publiee: true };
const date = (v: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR") : null);
const expiree = (o: Offre) => !!o.dateLimite && o.dateLimite.slice(0, 10) < new Date().toISOString().slice(0, 10);

export default function Opportunites() {
  const [offres, setOffres] = useState<Offre[] | null>(null);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [f, setF] = useState(VIDE);
  const [edition, setEdition] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [interesses, setInteresses] = useState<Record<string, Interesse[] | undefined>>({});

  const charger = useCallback(() => {
    api<Offre[]>("/admin/offres")
      .then(setOffres)
      .catch((e) => toaster.create({ type: "error", title: messageErreur(e) }));
  }, []);
  useEffect(() => {
    charger();
    api<{ domaines: Domaine[] }>("/referentiels").then((r) => setDomaines(r.domaines)).catch(() => undefined);
  }, [charger]);

  function nouvelle() {
    setF(VIDE);
    setEdition(null);
    setErreurs({});
    setFormulaire(true);
  }
  function modifier(o: Offre) {
    setF({
      titre: o.titre,
      pays: o.pays,
      ville: o.ville ?? "",
      domaine: o.domaine ?? "",
      typeContrat: o.typeContrat ?? "",
      description: o.description,
      gradeRequis: o.gradeRequis,
      dateLimite: o.dateLimite?.slice(0, 10) ?? "",
      publiee: o.publiee,
    });
    setEdition(o.id);
    setErreurs({});
    setFormulaire(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    try {
      const corps = { ...f, dateLimite: f.dateLimite || null };
      const r = await api<{ prevenus: number }>(edition ? `/admin/offres/${edition}` : "/admin/offres", { methode: edition ? "PUT" : "POST", corps });
      toaster.create({
        type: "success",
        title: edition ? "Offre mise à jour." : "Offre publiée.",
        description: r.prevenus ? `${r.prevenus} candidat(s) au grade suffisant ont été prévenus dans leur espace.` : undefined,
      });
      setFormulaire(false);
      setEdition(null);
      charger();
    } catch (err) {
      if (err instanceof ErreurClient && err.details) setErreurs(err.details);
      toaster.create({ type: "error", title: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerPublication(o: Offre) {
    try {
      const corps = {
        titre: o.titre,
        pays: o.pays,
        ville: o.ville,
        domaine: o.domaine,
        typeContrat: o.typeContrat,
        description: o.description,
        gradeRequis: o.gradeRequis,
        dateLimite: o.dateLimite?.slice(0, 10) ?? null,
        publiee: !o.publiee,
      };
      await api(`/admin/offres/${o.id}`, { methode: "PUT", corps });
      toaster.create({ type: "success", title: o.publiee ? "Offre retirée : les candidats ne la voient plus." : "Offre publiée." });
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function supprimer(o: Offre) {
    if (!window.confirm(`Supprimer définitivement l'offre « ${o.titre} » ?`)) return;
    try {
      await api(`/admin/offres/${o.id}`, { methode: "DELETE" });
      toaster.create({ type: "success", title: "Offre supprimée." });
      charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  async function voirInteresses(id: string) {
    if (interesses[id]) return setInteresses((x) => ({ ...x, [id]: undefined }));
    try {
      const liste = await api<Interesse[]>(`/admin/offres/${id}/interesses`);
      setInteresses((x) => ({ ...x, [id]: liste }));
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  const champ = (cle: keyof typeof VIDE, libelle: string, aide?: string, type = "text") => (
    <Field.Root invalid={!!erreurs[cle]}>
      <Field.Label>{libelle}</Field.Label>
      <Input type={type} value={String(f[cle])} onChange={(e) => setF({ ...f, [cle]: e.target.value })} />
      {aide && <Field.HelperText>{aide}</Field.HelperText>}
      <Field.ErrorText>{erreurs[cle]}</Field.ErrorText>
    </Field.Root>
  );

  return (
    <Stack gap="6">
      <EnTete
        titre="Opportunités"
        sousTitre="Publiez des offres d'emploi. Tous les candidats les voient, mais seuls ceux qui ont le grade requis (ou un grade supérieur) peuvent les ouvrir."
        actions={
          !formulaire && (
            <Button colorPalette="emeraude" onClick={nouvelle}>
              <LuPlus /> Publier une offre
            </Button>
          )
        }
      />

      {formulaire && (
        <Carte as="form" onSubmit={enregistrer} className="bdt-page">
          <Stack gap="4">
            <Text fontWeight="700" fontSize="lg" color="nuit">
              {edition ? "Modifier l'offre" : "Nouvelle offre"}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              {champ("titre", "Intitulé du poste")}
              <Field.Root invalid={!!erreurs.gradeRequis}>
                <Field.Label>Grade requis</Field.Label>
                <HStack gap="2" wrap="wrap">
                  {GRADES_OFFRE.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={f.gradeRequis === g ? "solid" : "outline"}
                      colorPalette="emeraude"
                      borderRadius="full"
                      onClick={() => setF({ ...f, gradeRequis: g })}
                      aria-pressed={f.gradeRequis === g}
                    >
                      {g} · {LIBELLES_GRADES[g].libelle}
                    </Button>
                  ))}
                </HStack>
                <Field.HelperText>Les candidats de ce grade ou d&apos;un grade supérieur pourront l&apos;ouvrir.</Field.HelperText>
              </Field.Root>
              {champ("pays", "Pays", "Ex. Canada, Allemagne, Émirats arabes unis")}
              {champ("ville", "Ville (facultatif)")}
              <Field.Root>
                <Field.Label>Domaine (facultatif)</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={f.domaine} onChange={(e) => setF({ ...f, domaine: e.target.value })}>
                    <option value="">Tous domaines</option>
                    {domaines.map((d) => (
                      <option key={d.id} value={d.nom}>
                        {d.nom}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              {champ("typeContrat", "Type de contrat (facultatif)", "Ex. CDI, contrat de 2 ans, saisonnier")}
              {champ("dateLimite", "Date limite (facultatif)", "Après cette date, l'offre n'est plus montrée.", "date")}
              <Field.Root>
                <Field.Label>Visibilité</Field.Label>
                <Switch.Root checked={f.publiee} onCheckedChange={(e) => setF({ ...f, publiee: e.checked })} colorPalette="emeraude">
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>{f.publiee ? "Publiée : visible des candidats" : "Brouillon : invisible des candidats"}</Switch.Label>
                </Switch.Root>
              </Field.Root>
            </SimpleGrid>
            <Field.Root invalid={!!erreurs.description}>
              <Field.Label>Description, conditions et démarche</Field.Label>
              <Textarea rows={7} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              <Field.HelperText>Visible seulement des candidats qui ont le grade requis.</Field.HelperText>
              <Field.ErrorText>{erreurs.description}</Field.ErrorText>
            </Field.Root>
            <HStack gap="2" justify="flex-end">
              <Button variant="ghost" onClick={() => setFormulaire(false)}>
                Annuler
              </Button>
              <Button type="submit" colorPalette="emeraude" loading={envoi}>
                {edition ? "Enregistrer" : f.publiee ? "Publier l'offre" : "Enregistrer le brouillon"}
              </Button>
            </HStack>
          </Stack>
        </Carte>
      )}

      {!offres ? (
        <Spinner color="emeraude.600" />
      ) : offres.length === 0 ? (
        <Carte textAlign="center" py="10">
          <Text color="gris">Aucune offre pour l&apos;instant. Publiez la première avec le bouton ci-dessus.</Text>
        </Carte>
      ) : (
        <Stack gap="3">
          {offres.map((o) => (
            <Carte key={o.id} p="5">
              <HStack gap="4" align="flex-start" wrap={{ base: "wrap", md: "nowrap" }}>
                <PastilleGrade grade={o.gradeRequis} />
                <Stack gap="1" flex="1" minW="0">
                  <HStack gap="2" wrap="wrap">
                    <Text fontWeight="700" color="nuit" fontSize="lg">
                      {o.titre}
                    </Text>
                    {!o.publiee ? <Badge>Brouillon</Badge> : expiree(o) ? <Badge colorPalette="orange">Expirée</Badge> : <Badge colorPalette="green">Publiée</Badge>}
                  </HStack>
                  <HStack gap="3" color="gris" fontSize="sm" wrap="wrap">
                    <HStack gap="1">
                      <LuGlobe /> <Text>{[o.ville, o.pays].filter(Boolean).join(", ")}</Text>
                    </HStack>
                    {o.domaine && <Text>· {o.domaine}</Text>}
                    {o.typeContrat && <Text>· {o.typeContrat}</Text>}
                    <Text>· Grade {o.gradeRequis}{o.gradeRequis === "A" ? "" : " ou plus"}</Text>
                    {o.dateLimite && <Text>· Jusqu&apos;au {date(o.dateLimite)}</Text>}
                  </HStack>
                </Stack>
                <HStack gap="1" wrap="wrap">
                  <Button size="sm" variant="outline" onClick={() => voirInteresses(o.id)}>
                    <LuUsers /> {o.interesses} intéressé(s)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => basculerPublication(o)} title={o.publiee ? "Retirer" : "Publier"}>
                    {o.publiee ? <LuEyeOff /> : <LuEye />} {o.publiee ? "Retirer" : "Publier"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => modifier(o)} aria-label="Modifier">
                    <LuPencil />
                  </Button>
                  <Button size="sm" variant="ghost" color="red.600" onClick={() => supprimer(o)} aria-label="Supprimer">
                    <LuTrash2 />
                  </Button>
                </HStack>
              </HStack>
              {interesses[o.id] && (
                <Box mt="4" pt="4" borderTopWidth="1px" borderColor="brume">
                  {interesses[o.id]!.length === 0 ? (
                    <Text fontSize="sm" color="gris">
                      Aucun candidat intéressé pour l&apos;instant.
                    </Text>
                  ) : (
                    <Stack gap="2">
                      {interesses[o.id]!.map((c) => (
                        <HStack key={c.dossierId} gap="3" bg="fond" borderRadius="carte" p="3" wrap="wrap">
                          {c.grade && <PastilleGrade grade={c.grade} taille="sm" />}
                          <Stack gap="0" flex="1" minW="0">
                            <Link href={`/admin/candidats/${c.dossierId}`}>
                              <Text fontWeight="600" color="nuit" _hover={{ textDecoration: "underline" }}>
                                {c.nom}
                              </Text>
                            </Link>
                            <Text fontSize="xs" color="gris">
                              {[c.metier, `intéressé(e) le ${date(c.le)}`].filter(Boolean).join(" · ")}
                            </Text>
                          </Stack>
                          <EtatGrade etat={c.etatGrade} />
                          <BoutonWhatsApp dossierId={c.dossierId} prenom={c.nom.split(" ")[0] ?? ""} telephone={c.telephone} taille="xs" />
                        </HStack>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Carte>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
