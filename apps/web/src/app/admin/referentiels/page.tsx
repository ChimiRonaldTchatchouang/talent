"use client";

import { LIBELLES_ELEMENTS } from "@bdt/shared";
import { Badge, Button, Heading, HStack, Spinner, Stack, Tabs, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Carte } from "@/components/carte";
import { ListeReference } from "@/components/liste-reference";
import { toaster } from "@/components/toaster";
import { api, messageErreur } from "@/lib/api";
import type { Competence, Diplome, Domaine, Service, TestLangue } from "@/lib/types";

interface Listes {
  domaines: Domaine[];
  competences: Competence[];
  testsLangue: TestLangue[];
  services: Service[];
  diplomes: Diplome[];
}

const ELEMENTS_SERVICE = (["COACHING", "TEST_LANGUE", "NIVEAU"] as const).map((e) => ({
  valeur: e,
  libelle: LIBELLES_ELEMENTS[e],
}));

export default function PageReferentiels() {
  const [listes, setListes] = useState<Listes | null>(null);

  const charger = useCallback(async () => {
    try {
      const [domaines, competences, testsLangue, services, diplomes] = await Promise.all([
        api<{ elements: Domaine[] }>("/admin/referentiels/domaines"),
        api<{ elements: Competence[] }>("/admin/referentiels/competences"),
        api<{ elements: TestLangue[] }>("/admin/referentiels/tests-langue"),
        api<{ elements: Service[] }>("/admin/referentiels/services"),
        api<{ elements: Diplome[] }>("/admin/referentiels/diplomes"),
      ]);
      setListes({
        domaines: domaines.elements,
        competences: competences.elements,
        testsLangue: testsLangue.elements,
        services: services.elements,
        diplomes: diplomes.elements,
      });
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function decider(id: string, decision: "VALIDEE" | "REJETEE") {
    try {
      await api(`/admin/referentiels/competences/${id}/decision`, { methode: "POST", corps: { decision } });
      toaster.create({ type: "success", title: decision === "VALIDEE" ? "Compétence validée." : "Compétence rejetée." });
      void charger();
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }

  if (!listes) return <Spinner color="emeraude.600" />;

  const optionsDomaines = listes.domaines.filter((d) => d.actif).map((d) => ({ valeur: d.id, libelle: d.nom }));
  const proposees = listes.competences.filter((c) => c.statut === "PROPOSEE");
  const validees = listes.competences.filter((c) => c.statut === "VALIDEE");

  const onglets: { valeur: string; titre: string; compteur?: number; contenu: React.ReactNode }[] = [
    {
      valeur: "domaines",
      titre: "Domaines",
      contenu: (
        <ListeReference
          chemin="domaines"
          libelleAjout="Ajouter un domaine"
          champs={[{ cle: "nom", libelle: "Nom", type: "texte" }]}
          elements={listes.domaines}
          onChange={charger}
        />
      ),
    },
    {
      valeur: "competences",
      titre: "Compétences",
      compteur: proposees.length,
      contenu: (
        <Stack gap="6">
          {proposees.length > 0 && (
            <Carte bg="brume" boxShadow="none">
              <Text fontWeight="600" color="nuit" mb="3">
                Propositions des candidats à valider ({proposees.length})
              </Text>
              <Stack gap="2">
                {proposees.map((c) => (
                  <HStack key={c.id} justify="space-between" bg="white" borderRadius="carte" p="3" wrap="wrap">
                    <Text>
                      <strong>{c.nom}</strong> · {c.domaine}
                    </Text>
                    <HStack>
                      <Button size="xs" variant="outline" onClick={() => decider(c.id, "REJETEE")}>
                        Rejeter
                      </Button>
                      <Button size="xs" colorPalette="emeraude" onClick={() => decider(c.id, "VALIDEE")}>
                        Valider
                      </Button>
                    </HStack>
                  </HStack>
                ))}
              </Stack>
            </Carte>
          )}
          <ListeReference
            chemin="competences"
            libelleAjout="Ajouter une compétence"
            champs={[
              { cle: "nom", libelle: "Nom", type: "texte" },
              { cle: "domaineId", libelle: "Domaine", type: "liste", options: optionsDomaines },
            ]}
            elements={validees}
            onChange={charger}
          />
        </Stack>
      ),
    },
    {
      valeur: "tests",
      titre: "Tests de langue",
      contenu: (
        <ListeReference
          chemin="tests-langue"
          libelleAjout="Ajouter un test de langue"
          champs={[
            { cle: "nom", libelle: "Nom", type: "texte" },
            { cle: "scoreMinimum", libelle: "Score minimum accepté", type: "nombre", facultatif: true },
          ]}
          elements={listes.testsLangue}
          onChange={charger}
        />
      ),
    },
    {
      valeur: "services",
      titre: "Services",
      contenu: (
        <ListeReference
          chemin="services"
          libelleAjout="Ajouter un service"
          champs={[
            { cle: "nom", libelle: "Nom", type: "texte" },
            { cle: "description", libelle: "Description", type: "texte", largeur: "2" },
            { cle: "duree", libelle: "Durée", type: "texte" },
            {
              cle: "elementComble",
              libelle: "Élément du grade comblé",
              type: "liste",
              options: ELEMENTS_SERVICE,
              facultatif: true,
            },
          ]}
          elements={listes.services}
          onChange={charger}
        />
      ),
    },
    {
      valeur: "diplomes",
      titre: "Diplômes",
      contenu: (
        <ListeReference
          chemin="diplomes"
          libelleAjout="Ajouter un niveau de diplôme"
          champs={[
            { cle: "nom", libelle: "Niveau", type: "texte" },
            { cle: "ordre", libelle: "Ordre d'affichage", type: "nombre" },
          ]}
          elements={listes.diplomes}
          onChange={charger}
        />
      ),
    },
  ];

  return (
    <Stack gap="6">
      <Stack gap="1">
        <Heading as="h1" size="2xl" color="nuit">
          Listes de référence
        </Heading>
        <Text color="gris">
          Un élément désactivé n&apos;est plus proposé aux candidats, mais reste affiché dans les dossiers qui
          l&apos;utilisent déjà.
        </Text>
      </Stack>
      <Carte>
        <Tabs.Root defaultValue="domaines" variant="enclosed" colorPalette="emeraude">
          <Tabs.List flexWrap="wrap">
            {onglets.map((o) => (
              <Tabs.Trigger key={o.valeur} value={o.valeur}>
                {o.titre}
                {!!o.compteur && (
                  <Badge ml="2" bg="menthe" color="nuit" borderRadius="full">
                    {o.compteur}
                  </Badge>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {onglets.map((o) => (
            <Tabs.Content key={o.valeur} value={o.valeur} pt="6">
              {o.contenu}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Carte>
    </Stack>
  );
}
