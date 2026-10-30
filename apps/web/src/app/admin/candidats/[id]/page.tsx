"use client";

import {
  GRADES,
  LIBELLES_BUREAUTIQUE,
  LIBELLES_ENFANTS,
  LIBELLES_ETATS_SERVICE,
  LIBELLES_GRADES,
  LIBELLES_NIVEAUX_EVALUES,
  LIBELLES_PIECES,
  LIBELLES_SEXES,
  LIBELLES_SITUATIONS,
  LIBELLES_TRANCHES,
  NIVEAUX_EVALUES,
  type TypePiece,
} from "@bdt/shared";
import { Alert, Badge, Box, Button, Grid, HStack, NativeSelect, Spinner, Stack, Tabs, Text, Textarea } from "@chakra-ui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { BadgeEtat, PastilleGrade } from "@/components/badges";
import { Carte } from "@/components/carte";
import { LigneElement } from "@/components/candidat/grade";
import { EtatGrade } from "@/components/admin/communs";
import { DecisionPiece, ouvrirPiece } from "@/components/admin/decision-piece";
import { toaster } from "@/components/toaster";
import { api, ErreurClient, messageErreur } from "@/lib/api";
import type { Classement, Dossier, PieceDeposee } from "@/lib/types";

interface Fiche {
  dossier: Dossier;
  pieces: { requises: { type: string; manquante: boolean }[]; deposees: PieceDeposee[] };
  compte: { email: string | null; telephone: string | null; emailConfirme: boolean; creeLe: string; derniereConnexion: string | null };
  consentements: { traitementLe: string; recruteursLe: string | null };
  classement: Classement;
  notes: { id: string; texte: string; auteur: string; creeLe: string }[];
  historique: { id: string; action: string; acteur: string; details: unknown; creeLe: string }[];
}
interface Historique {
  historique: { id: string; grade: string; etat: string; cause: string; raison: string | null; creeLe: string }[];
}

const date = (v: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR") : "—");
const ouiNon = (v: boolean | null) => (v === null ? "—" : v ? "Oui" : "Non");

function Lignes({ lignes }: { lignes: [string, React.ReactNode][] }) {
  return (
    <Grid templateColumns={{ base: "1fr", md: "220px 1fr" }} columnGap="6" rowGap="2">
      {lignes.map(([l, v]) => (
        <Box key={l} display="contents">
          <Text color="gris" fontSize="sm">
            {l}
          </Text>
          <Text fontSize="sm" mb={{ base: "2", md: "0" }}>
            {v === null || v === undefined || v === "" ? "—" : v}
          </Text>
        </Box>
      ))}
    </Grid>
  );
}

const ACTIONS: Record<string, string> = {
  INSCRIPTION: "Inscription",
  CONNEXION: "Connexion",
  DOSSIER_MODIFIE: "Dossier modifié",
  DOSSIER_MODIFIE_APRES_ENVOI: "Dossier modifié après envoi",
  DOSSIER_ENVOYE: "Dossier envoyé",
  DOSSIER_CONSULTE: "Dossier consulté",
  PIECE_DEPOSEE: "Pièce déposée",
  PIECE_REDEPOSEE: "Pièce redéposée",
  PIECE_RETIREE: "Pièce retirée",
  PIECE_VERIFIEE: "Pièce vérifiée",
  PIECE_REFUSEE: "Pièce refusée",
  PIECE_CONSULTEE: "Pièce consultée",
  GRADE_CONFIRME: "Grade confirmé",
  GRADE_CORRIGE: "Grade corrigé",
  GRADE_LIBERE: "Grade libéré",
  GRADE_REMIS_EN_PROVISOIRE: "Grade remis en provisoire",
  NIVEAU_EVALUE: "Niveau évalué",
  SERVICE_INTERESSE: "Intérêt pour un service",
  SERVICE_ETAT_MODIFIE: "Service mis à jour",
  NOTE_AJOUTEE: "Note ajoutée",
  CONSENTEMENT_RECRUTEURS_DONNE: "Accord recruteurs donné",
  CONSENTEMENT_RECRUTEURS_RETIRE: "Accord recruteurs retiré",
  EMAIL_CONFIRME: "E-mail confirmé",
  MOT_DE_PASSE_REINITIALISE_PAR_ADMIN: "Mot de passe réinitialisé par le cabinet",
};

export default function FicheCandidat() {
  const { id } = useParams<{ id: string }>();
  const [f, setF] = useState<Fiche | null>(null);
  const [historiqueGrades, setHistoriqueGrades] = useState<Historique["historique"]>([]);
  const [correction, setCorrection] = useState<{ grade: string; raison: string } | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState("");
  const [motDePasse, setMotDePasse] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [fiche, c] = await Promise.all([api<Fiche>(`/admin/dossiers/${id}`), api<Historique>(`/admin/dossiers/${id}/classement`)]);
      setF(fiche);
      setHistoriqueGrades(c.historique);
    } catch (e) {
      toaster.create({ type: "error", title: messageErreur(e) });
    }
  }, [id]);
  useEffect(() => {
    void charger();
  }, [charger]);

  async function action(methode: "POST" | "PUT", chemin: string, corps: unknown, succes: string) {
    setEnvoi(true);
    setErreurs(null);
    try {
      await api(chemin, { methode, corps });
      toaster.create({ type: "success", title: succes });
      setCorrection(null);
      await charger();
    } catch (e) {
      if (e instanceof ErreurClient && e.details) setErreurs(e.details);
      toaster.create({ type: "error", title: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!f) return <Spinner color="emeraude.600" />;
  const { dossier: d, classement: c } = f;
  const nom = [d.prenoms, d.nom].filter(Boolean).join(" ") || "Sans nom";
  const brouillon = d.statut !== "ENVOYE";

  return (
    <Stack gap="5">
      <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
        <Link href="/admin/vivier">
          <LuArrowLeft /> Retour au vivier
        </Link>
      </Button>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 380px" }} gap="5" alignItems="start">
        <Stack gap="5" minW="0">
          <Carte>
            <HStack gap="4" align="center" wrap="wrap">
              <PastilleGrade grade={c.grade} taille="lg" />
              <Stack gap="1" flex="1">
                <Text fontSize="2xl" fontWeight="700" color="nuit">
                  {nom}
                </Text>
                <Text color="gris">
                  {[d.metier, d.domaine, d.ville].filter(Boolean).join(" · ")} · {brouillon ? "Brouillon (non envoyé)" : `Envoyé le ${date(d.envoyeLe)}`}
                </Text>
                <HStack gap="2" wrap="wrap">
                  <Text fontWeight="600">
                    {c.grade === "HORS_BASSIN" ? "Hors bassin" : `Grade ${c.grade}`} · {LIBELLES_GRADES[c.grade].libelle}
                  </Text>
                  <EtatGrade etat={c.etat} alerte={c.alerte} />
                </HStack>
                {c.etat === "CORRIGE" && (
                  <Text fontSize="sm" color="gris">
                    Corrigé (grade calculé : {c.gradeCalcule}). Raison : {c.raison}
                  </Text>
                )}
              </Stack>
            </HStack>
          </Carte>

          <Carte>
            <Tabs.Root defaultValue="personnel" variant="enclosed" colorPalette="emeraude">
              <Tabs.List flexWrap="wrap">
                <Tabs.Trigger value="personnel">Personnel</Tabs.Trigger>
                <Tabs.Trigger value="academique">Académique</Tabs.Trigger>
                <Tabs.Trigger value="pro">Professionnel</Tabs.Trigger>
                <Tabs.Trigger value="famille">Matrimonial</Tabs.Trigger>
                <Tabs.Trigger value="pieces">Justificatifs</Tabs.Trigger>
                <Tabs.Trigger value="services">Services</Tabs.Trigger>
                <Tabs.Trigger value="historique">Historique</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="personnel" pt="5">
                <Stack gap="5">
                  <Lignes
                    lignes={[
                      ["Nom", d.nom],
                      ["Prénom(s)", d.prenoms],
                      ["Date de naissance", date(d.dateNaissance)],
                      ["Sexe", d.sexe ? LIBELLES_SEXES[d.sexe] : null],
                      ["Nationalité", d.nationalite],
                      ["Ville", d.ville],
                      ["Téléphone", d.telephoneContact],
                      ["E-mail", d.emailContact],
                      ["Langues parlées", d.languesParlees.join(", ")],
                      ["Passeport", d.aPasseport ? `Oui, expire le ${date(d.passeportExpiration)}` : ouiNon(d.aPasseport)],
                    ]}
                  />
                  <Box bg="brume" borderRadius="carte" p="4">
                    <Text fontWeight="600" color="nuit" mb="2">
                      Compte et accords
                    </Text>
                    <Lignes
                      lignes={[
                        ["Identifiant", f.compte.email ?? f.compte.telephone],
                        ["E-mail confirmé", f.compte.email ? ouiNon(f.compte.emailConfirme) : "Compte sans e-mail"],
                        ["Inscrit le", date(f.compte.creeLe)],
                        ["Accord traitement", `Donné le ${date(f.consentements.traitementLe)}`],
                        ["Accord recruteurs", f.consentements.recruteursLe ? `Donné le ${date(f.consentements.recruteursLe)}` : "Non"],
                      ]}
                    />
                    {motDePasse ? (
                      <Alert.Root status="warning" borderRadius="carte" mt="3">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>Mot de passe provisoire : {motDePasse}</Alert.Title>
                          <Alert.Description>Communiquez-le au candidat. Il ne sera plus affiché.</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        bg="white"
                        mt="3"
                        onClick={async () => {
                          try {
                            setMotDePasse((await api<{ motDePasse: string }>(`/admin/dossiers/${id}/mot-de-passe`, { methode: "POST" })).motDePasse);
                          } catch (e) {
                            toaster.create({ type: "error", title: messageErreur(e) });
                          }
                        }}
                      >
                        Réinitialiser le mot de passe
                      </Button>
                    )}
                  </Box>
                </Stack>
              </Tabs.Content>

              <Tabs.Content value="academique" pt="5">
                <Lignes
                  lignes={[
                    ["A un diplôme", ouiNon(d.aDiplome)],
                    ...(d.aDiplome
                      ? ([
                          ["Niveau", d.diplome],
                          ["Diplôme", d.diplomeIntitule],
                          ["Filière", d.filiere],
                          ["Établissement", d.etablissement],
                          ["Année", d.diplomeAnnee],
                          ["Pays", d.diplomePays],
                        ] as [string, React.ReactNode][])
                      : []),
                    ["Test de langue", ouiNon(d.aTestLangue)],
                    ...(d.aTestLangue
                      ? ([
                          ["Test", d.testLangue],
                          ["Score", d.testScore],
                          ["Date du test", date(d.testDate)],
                        ] as [string, React.ReactNode][])
                      : []),
                  ]}
                />
              </Tabs.Content>

              <Tabs.Content value="pro" pt="5">
                <Stack gap="4">
                  <Lignes
                    lignes={[
                      ["A déjà travaillé", ouiNon(d.aTravaille)],
                      ...(d.aTravaille
                        ? ([
                            ["Domaine", d.domaine],
                            ["Métier", d.metier],
                            ["Expérience", d.trancheExperience ? LIBELLES_TRANCHES[d.trancheExperience as keyof typeof LIBELLES_TRANCHES] : null],
                            ["Bureautique", d.bureautique ? LIBELLES_BUREAUTIQUE[d.bureautique as keyof typeof LIBELLES_BUREAUTIQUE] : null],
                            ["Compétences", d.competences.map((x) => (x.statut === "PROPOSEE" ? `${x.nom} (à valider)` : x.nom)).join(", ")],
                          ] as [string, React.ReactNode][])
                        : []),
                    ]}
                  />
                  {d.aTravaille &&
                    d.experiences.map((e, i) => (
                      <Box key={i} bg="brume" borderRadius="carte" p="3" fontSize="sm">
                        <Text fontWeight="600">
                          {e.poste} · {e.employeur}
                        </Text>
                        <Text color="gris">
                          {e.debut ?? "?"} → {e.fin ?? "en cours"} {e.ville && `· ${e.ville}`}
                        </Text>
                      </Box>
                    ))}
                </Stack>
              </Tabs.Content>

              <Tabs.Content value="famille" pt="5">
                <Lignes
                  lignes={[
                    ["Situation", d.situation ? LIBELLES_SITUATIONS[d.situation as keyof typeof LIBELLES_SITUATIONS] : null],
                    ...(d.situation === "MARIE" || d.situation === "UNION_LIBRE"
                      ? ([
                          ["Conjoint", d.conjointNom],
                          ["Profession du conjoint", d.conjointProfession],
                          ["Passeport du conjoint", ouiNon(d.conjointPasseport)],
                        ] as [string, React.ReactNode][])
                      : []),
                    ["Enfants", d.enfants ? LIBELLES_ENFANTS[d.enfants as keyof typeof LIBELLES_ENFANTS] : null],
                    ["Personnes qui partiraient", d.partAvecAccompagnants ? d.nombreAccompagnants : ouiNon(d.partAvecAccompagnants)],
                  ]}
                />
              </Tabs.Content>

              <Tabs.Content value="pieces" pt="5">
                <Stack gap="3">
                  {f.pieces.requises
                    .filter((r) => r.manquante && !f.pieces.deposees.some((p) => p.type === r.type && !p.ignoree))
                    .map((r) => (
                      <HStack key={r.type} justify="space-between" bg="brume" borderRadius="carte" p="3">
                        <Text fontWeight="600">{LIBELLES_PIECES[r.type as TypePiece]}</Text>
                        <Text fontSize="sm" color="gris">
                          À déposer
                        </Text>
                      </HStack>
                    ))}
                  {f.pieces.deposees.map((p) => (
                    <Stack key={p.id} gap="2" borderWidth="1px" borderColor="brume" borderRadius="carte" p="3">
                      <HStack justify="space-between" wrap="wrap" gap="2">
                        <Box>
                          <Text fontWeight="600">
                            {LIBELLES_PIECES[p.type as TypePiece]}
                            {p.ignoree && " (plus demandée)"}
                          </Text>
                          <Text fontSize="xs" color="gris">
                            {p.nomFichier} · déposée le {date(p.deposeLe)}
                          </Text>
                        </Box>
                        <BadgeEtat etat={p.etat === "DEPOSEE" ? "EN_ATTENTE" : p.etat === "VERIFIEE" ? "VERIFIE" : "REFUSE"} />
                      </HStack>
                      {p.refus.map((r, i) => (
                        <Text key={i} fontSize="xs" color="etat.refuseTexte">
                          Refusée le {date(r.le)} : {r.motif}
                        </Text>
                      ))}
                      {p.etat === "DEPOSEE" ? (
                        <DecisionPiece id={p.id} onFait={charger} />
                      ) : (
                        <Button size="xs" variant="outline" alignSelf="flex-start" onClick={() => ouvrirPiece(p.id)}>
                          Voir le document
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Tabs.Content>

              <Tabs.Content value="services" pt="5">
                <Stack gap="2">
                  {c.services.map((s) => (
                    <HStack key={s.id} justify="space-between" bg="brume" borderRadius="carte" p="3" wrap="wrap" gap="2">
                      <Box>
                        <Text fontWeight="600">
                          {s.nom} {s.suggere && <Badge bg="menthe" color="nuit" ml="1">Suggéré</Badge>}
                        </Text>
                        <Text fontSize="sm" color="gris">
                          {LIBELLES_ETATS_SERVICE[s.etat]}
                        </Text>
                      </Box>
                      <HStack gap="1" wrap="wrap">
                        {(["ACCEPTE", "EN_COURS", "REALISE"] as const)
                          .filter((e) => ["SUGGERE", "INTERESSE", "ACCEPTE", "EN_COURS", "REALISE"].indexOf(e) > ["SUGGERE", "INTERESSE", "ACCEPTE", "EN_COURS", "REALISE"].indexOf(s.etat))
                          .map((e) => (
                            <Button key={e} size="xs" colorPalette="emeraude" variant={e === "REALISE" ? "solid" : "outline"} bg={e === "REALISE" ? undefined : "white"} loading={envoi} onClick={() => action("PUT", `/admin/dossiers/${id}/services/${s.id}`, { etat: e }, `Service : ${LIBELLES_ETATS_SERVICE[e]}.`)}>
                              {LIBELLES_ETATS_SERVICE[e]}
                            </Button>
                          ))}
                        {s.etat !== "SUGGERE" && (
                          <Button size="xs" variant="ghost" loading={envoi} onClick={() => action("PUT", `/admin/dossiers/${id}/services/${s.id}`, { etat: "ANNULE" }, "Service annulé.")}>
                            Annuler
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  ))}
                </Stack>
              </Tabs.Content>

              <Tabs.Content value="historique" pt="5">
                <Stack gap="5">
                  <Box>
                    <Text fontWeight="600" color="nuit" mb="2">
                      Historique du grade
                    </Text>
                    <Stack gap="1">
                      {historiqueGrades.map((h) => (
                        <Text key={h.id} fontSize="sm">
                          <Text as="span" color="gris">
                            {new Date(h.creeLe).toLocaleString("fr-FR")}
                          </Text>{" "}
                          · {h.grade === "HORS_BASSIN" ? "Hors bassin" : h.grade} ({h.etat.toLowerCase()}) · {h.cause}
                          {h.raison && ` · « ${h.raison} »`}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Text fontWeight="600" color="nuit" mb="2">
                      Journal du dossier
                    </Text>
                    <Stack gap="1">
                      {f.historique.map((h) => (
                        <Text key={h.id} fontSize="sm">
                          <Text as="span" color="gris">
                            {new Date(h.creeLe).toLocaleString("fr-FR")}
                          </Text>{" "}
                          · {ACTIONS[h.action] ?? h.action} · {h.acteur}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Tabs.Content>
            </Tabs.Root>
          </Carte>
        </Stack>

        <Stack gap="5">
          <Carte>
            <Text fontWeight="700" color="nuit" mb="3">
              Actions sur le grade
            </Text>
            {brouillon ? (
              <Text fontSize="sm" color="gris">
                Le dossier n&apos;est pas encore envoyé : le grade ne peut pas être confirmé.
              </Text>
            ) : (
              <Stack gap="3">
                {erreurs && Object.keys(erreurs).length > 0 && (
                  <Alert.Root status="error" borderRadius="carte">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Pièces à vérifier d&apos;abord :</Alert.Title>
                      <Alert.Description>{Object.keys(erreurs).map((t) => LIBELLES_PIECES[t as TypePiece] ?? erreurs[t]).join(", ")}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
                {c.etat === "PROVISOIRE" && (
                  <Button colorPalette="emeraude" loading={envoi} onClick={() => action("POST", `/admin/dossiers/${id}/grade/confirmer`, undefined, "Grade confirmé. Le candidat est prévenu.")}>
                    Confirmer le grade {c.grade === "HORS_BASSIN" ? "« hors bassin »" : c.grade}
                  </Button>
                )}
                {c.etat !== "PROVISOIRE" && (
                  <Button variant="outline" loading={envoi} onClick={() => action("POST", `/admin/dossiers/${id}/grade/liberer`, undefined, "Grade libéré : il redevient provisoire.")}>
                    Libérer le grade (redevient provisoire)
                  </Button>
                )}
                {correction ? (
                  <Stack gap="2" bg="brume" borderRadius="carte" p="3">
                    <NativeSelect.Root size="sm">
                      <NativeSelect.Field bg="white" value={correction.grade} onChange={(e) => setCorrection({ ...correction, grade: e.target.value })}>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g === "HORS_BASSIN" ? "Hors bassin" : `Grade ${g}`} · {LIBELLES_GRADES[g].libelle}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Textarea bg="white" size="sm" placeholder="Raison de la correction (obligatoire)" value={correction.raison} onChange={(e) => setCorrection({ ...correction, raison: e.target.value })} />
                    <HStack>
                      <Button size="sm" variant="ghost" onClick={() => setCorrection(null)}>
                        Annuler
                      </Button>
                      <Button size="sm" colorPalette="emeraude" disabled={correction.raison.trim().length < 5} loading={envoi} onClick={() => action("POST", `/admin/dossiers/${id}/grade/corriger`, correction, "Grade corrigé. Le candidat est prévenu.")}>
                        Enregistrer la correction
                      </Button>
                    </HStack>
                  </Stack>
                ) : (
                  <Button variant="outline" onClick={() => setCorrection({ grade: c.grade, raison: "" })}>
                    Corriger le grade
                  </Button>
                )}
              </Stack>
            )}
            <Box mt="4">
              <Text fontSize="sm" fontWeight="600" mb="1">
                Niveau dans le domaine
              </Text>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field bg="brume" value={c.niveauEvalue} onChange={(e) => action("PUT", `/admin/dossiers/${id}/niveau`, { niveau: e.target.value }, "Niveau enregistré.")}>
                  {NIVEAUX_EVALUES.map((n) => (
                    <option key={n} value={n}>
                      {LIBELLES_NIVEAUX_EVALUES[n]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </Carte>

          <Stack gap="2">
            <Text fontWeight="700" color="nuit">
              Pourquoi ce grade
            </Text>
            {c.elements.map((e) => (
              <LigneElement key={e.element} e={e} />
            ))}
          </Stack>

          <Carte>
            <Text fontWeight="700" color="nuit" mb="3">
              Notes internes
            </Text>
            <Stack gap="2" mb="3">
              <Textarea bg="brume" size="sm" placeholder="Visible uniquement par le cabinet" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button
                size="sm"
                colorPalette="emeraude"
                alignSelf="flex-end"
                disabled={!note.trim()}
                onClick={async () => {
                  try {
                    await api(`/admin/dossiers/${id}/notes`, { methode: "POST", corps: { texte: note } });
                    setNote("");
                    await charger();
                  } catch (e) {
                    toaster.create({ type: "error", title: messageErreur(e) });
                  }
                }}
              >
                Ajouter la note
              </Button>
            </Stack>
            <Stack gap="2">
              {f.notes.map((n) => (
                <Box key={n.id} bg="fond" borderRadius="carte" p="3">
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {n.texte}
                  </Text>
                  <Text fontSize="xs" color="gris" mt="1">
                    {n.auteur} · {new Date(n.creeLe).toLocaleString("fr-FR")}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Carte>
        </Stack>
      </Grid>
    </Stack>
  );
}

