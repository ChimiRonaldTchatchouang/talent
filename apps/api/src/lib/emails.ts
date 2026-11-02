import { randomUUID } from "node:crypto";
import { LIBELLES_GRADES, LIBELLES_PIECES, MARQUE, type Grade, type TypePiece } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import type { Config } from "./config.js";
import { rendreEmail, type Message } from "./gabarit-email.js";
import { lireReglages } from "./reglages.js";

export type { Message } from "./gabarit-email.js";

/**
 * Expéditeur de test fourni par Resend, utilisé tant qu'aucune adresse du domaine du cabinet
 * n'est configurée. Attention : Resend ne livre alors qu'à l'adresse du titulaire du compte Resend.
 */
export const EXPEDITEUR_TEST_RESEND = `${MARQUE.nom} <onboarding@resend.dev>`;

export const expediteur = (config: Config) => config.EMAIL_EXPEDITEUR || EXPEDITEUR_TEST_RESEND;

/**
 * Envoie un e-mail par Resend : tous les e-mails de la plateforme passent par ici (confirmation de
 * compte, mot de passe, notifications). Chaque e-mail part en HTML (gabarit de la charte) et en texte
 * brut, avec une adresse de réponse (e-mail du cabinet, si renseigné dans les réglages).
 * Sans clé configurée (mode démo), l'e-mail n'est pas envoyé : il est seulement écrit dans le journal
 * des e-mails, visible par les administrateurs. Un échec d'envoi n'interrompt jamais l'action en cours.
 */
export async function envoyerEmail(db: PrismaClient, config: Config, a: string, message: Message): Promise<void> {
  const reglages = await lireReglages(db);
  const { html, texte } = rendreEmail(message, { urlSite: config.URL_SITE, ...reglages });
  const trace = { destinataire: a, sujet: message.sujet, texte, html };

  // Comptes de démonstration (domaine réservé « .invalid ») : jamais d'envoi réel.
  if (!config.RESEND_API_KEY || a.endsWith("@demo.invalid")) {
    await db.emailEnvoye.create({ data: { ...trace, statut: "DEMO" } });
    return;
  }
  let erreur: string | null = null;
  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: expediteur(config),
        to: [a],
        subject: message.sujet,
        html,
        text: texte,
        ...(reglages.emailCabinet ? { reply_to: reglages.emailCabinet } : {}),
        // Identifiant unique : évite que Gmail regroupe des e-mails différents dans une même conversation.
        headers: { "X-Entity-Ref-ID": randomUUID() },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!reponse.ok) erreur = `Resend a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 300)}`;
  } catch (e) {
    erreur = `Resend injoignable : ${(e as Error).message}`;
  }
  await db.emailEnvoye.create({ data: { ...trace, statut: erreur ? "ECHEC" : "ENVOYE", erreur } });
}

/** E-mails à tous les administrateurs actifs. */
export async function envoyerAuxAdmins(db: PrismaClient, config: Config, message: Message): Promise<void> {
  const admins = await db.utilisateur.findMany({ where: { role: "ADMIN", etat: "ACTIF", email: { not: null } } });
  for (const admin of admins) await envoyerEmail(db, config, admin.email!, message);
}

const libelleGrade = (g: Grade) => (g === "HORS_BASSIN" ? "Hors bassin" : `Grade ${g}`);
const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Modèles d'e-mails : sujets sobres (ni majuscules, ni points d'exclamation, ni promesses), contenu utile.
 * Candidat tutoyé ; cabinet et recruteur vouvoyés.
 */
export const modeles = {
  // ---------- Candidat ----------

  compteCree: (lienConfirmation: string, lienEspace: string): Message => ({
    sujet: `Bienvenue sur ${MARQUE.nom} : confirme ton adresse e-mail`,
    apercu: "Ton compte est créé. Confirme ton adresse e-mail, puis remplis ton dossier à ton rythme.",
    public: "candidat",
    titre: "Bienvenue, ton compte est créé",
    paragraphes: ["Merci de ton inscription. Pour sécuriser ton compte, confirme ton adresse e-mail avec le bouton ci-dessous (lien valable 3 jours)."],
    bouton: { libelle: "Confirmer mon adresse e-mail", url: lienConfirmation },
    encadre: {
      titre: "La suite",
      lignes: [
        ["1.", "Remplis ton dossier, une question à la fois"],
        ["2.", "Dépose tes pièces (une photo suffit)"],
        ["3.", "Découvre ton grade et les services qui peuvent t'aider"],
      ],
    },
    ensuite: [`Tout est enregistré automatiquement : tu peux t'arrêter et reprendre quand tu veux sur ${lienEspace}.`],
  }),

  confirmationEmail: (lienConfirmation: string): Message => ({
    sujet: "Confirme ton adresse e-mail",
    apercu: "Voici ton nouveau lien de confirmation, valable 3 jours.",
    public: "candidat",
    titre: "Confirme ton adresse e-mail",
    paragraphes: ["Tu as demandé un nouveau lien de confirmation. Il est valable 3 jours."],
    bouton: { libelle: "Confirmer mon adresse e-mail", url: lienConfirmation },
  }),

  motDePasseOublie: (lien: string): Message => ({
    sujet: "Ton lien pour choisir un nouveau mot de passe",
    apercu: "Ce lien est valable 1 heure. Si tu n'as rien demandé, ignore cet e-mail.",
    public: "candidat",
    titre: "Choisis un nouveau mot de passe",
    paragraphes: ["Tu as demandé à changer ton mot de passe. Le lien ci-dessous est valable 1 heure."],
    bouton: { libelle: "Choisir un nouveau mot de passe", url: lien },
    ensuite: ["Si tu n'as rien demandé, ignore simplement cet e-mail : ton mot de passe reste le même."],
  }),

  dossierEnvoyeCandidat: (d: { envoyeLe: Date; piecesManquantes: TypePiece[]; lienEspace: string }): Message => ({
    sujet: "Ton dossier est bien envoyé",
    apercu: "Le cabinet va vérifier ton dossier. Tu peux encore le modifier à tout moment.",
    public: "candidat",
    titre: "Ton dossier est bien envoyé",
    paragraphes: [`Nous avons bien reçu ton dossier le ${date(d.envoyeLe)}. Le cabinet va le vérifier et confirmer ton grade.`],
    liste: d.piecesManquantes.length
      ? { titre: "Pièces encore à déposer (ton grade restera provisoire en attendant) :", elements: d.piecesManquantes.map((t) => LIBELLES_PIECES[t]) }
      : undefined,
    important: d.piecesManquantes.length ? undefined : "Toutes les pièces demandées sont déposées.",
    bouton: { libelle: "Voir mon dossier", url: d.lienEspace },
    ensuite: ["Tu peux encore modifier ton dossier et suivre ton grade depuis ton espace."],
  }),

  pieceRefusee: (d: { piece: TypePiece; motif: string; lien: string }): Message => ({
    sujet: `Pièce à redéposer : ${LIBELLES_PIECES[d.piece]}`,
    apercu: `Le cabinet n'a pas pu valider ta pièce. Motif : ${d.motif}`,
    public: "candidat",
    titre: "Une pièce est à redéposer",
    paragraphes: [`Le cabinet n'a pas pu valider ta pièce « ${LIBELLES_PIECES[d.piece]} ».`],
    encadre: { lignes: [["Pièce", LIBELLES_PIECES[d.piece]], ["Motif", d.motif]] },
    bouton: { libelle: "Déposer une nouvelle pièce", url: d.lien },
    ensuite: ["Astuce : prends la photo à la lumière du jour, document à plat et en entier."],
  }),

  gradeMisAJour: (d: { grade: Grade; corrige: boolean; lien: string }): Message => ({
    sujet: "Ton grade a été mis à jour",
    apercu: `${libelleGrade(d.grade)} : ${LIBELLES_GRADES[d.grade].libelle}.`,
    public: "candidat",
    titre: d.corrige ? "Le cabinet a fixé ton grade" : "Le cabinet a confirmé ton grade",
    paragraphes: [d.corrige ? "Après examen de ton dossier, le cabinet a fixé ton grade :" : "Après vérification de ton dossier, le cabinet a confirmé ton grade :"],
    grade: d.grade,
    bouton: { libelle: "Voir pourquoi ce grade", url: d.lien },
    ensuite: ["Ton espace t'indique ce qui te manque encore et les services du cabinet qui peuvent t'aider."],
  }),

  suppressionEffectuee: (): Message => ({
    sujet: "Ton dossier a été supprimé",
    apercu: "Comme tu l'as demandé, tes données ont été effacées.",
    public: "candidat",
    titre: "Ton dossier a été supprimé",
    paragraphes: [
      "Comme tu l'as demandé, ton dossier, tes documents et ton compte ont été supprimés de la plateforme.",
      "Tu pourras créer un nouveau compte à tout moment si tu le souhaites.",
    ],
  }),

  // ---------- Cabinet ----------

  dossierEnvoyeAdmin: (d: { nom: string; metier: string | null; ville: string | null; grade: Grade | null; piecesManquantes: number; lien: string }): Message => ({
    sujet: `Nouveau dossier reçu : ${d.nom}`,
    apercu: `${d.nom} vient d'envoyer son dossier${d.grade ? ` (${libelleGrade(d.grade)} provisoire)` : ""}.`,
    public: "cabinet",
    titre: "Nouveau dossier reçu",
    paragraphes: [`${d.nom} vient d'envoyer son dossier.`],
    encadre: {
      lignes: [
        ["Candidat", d.nom],
        ...(d.metier ? ([["Métier", d.metier]] as [string, string][]) : []),
        ...(d.ville ? ([["Ville", d.ville]] as [string, string][]) : []),
        ...(d.grade ? ([["Grade provisoire", `${libelleGrade(d.grade)} · ${LIBELLES_GRADES[d.grade].libelle}`]] as [string, string][]) : []),
        ["Pièces manquantes", d.piecesManquantes ? String(d.piecesManquantes) : "Aucune"],
      ],
    },
    bouton: { libelle: "Ouvrir la fiche", url: d.lien },
  }),

  gradeARevoir: (d: { nom: string; avant: Grade; etatAvant: "confirmé" | "corrigé"; apres: Grade; lien: string }): Message => ({
    sujet: `Grade à revoir : ${d.nom}`,
    apercu: `${d.nom} a modifié son dossier : son grade repasse en provisoire.`,
    public: "cabinet",
    titre: "Un grade est à revoir",
    paragraphes: [`${d.nom} a modifié son dossier. Son grade ${d.etatAvant} repasse en provisoire : merci de le revoir.`],
    encadre: { lignes: [["Avant", `${libelleGrade(d.avant)} (${d.etatAvant})`], ["Maintenant", `${libelleGrade(d.apres)} (provisoire)`]] },
    bouton: { libelle: "Revoir la fiche", url: d.lien },
  }),

  interetService: (d: { nom: string; service: string; grade: Grade | null; lien: string }): Message => ({
    sujet: `Intérêt pour « ${d.service} » : ${d.nom}`,
    apercu: `${d.nom} est intéressé(e) par le service « ${d.service} ».`,
    public: "cabinet",
    titre: "Un candidat est intéressé par un service",
    paragraphes: [`${d.nom} a cliqué sur « Je suis intéressé(e) ». Pensez à le recontacter.`],
    encadre: { lignes: [["Candidat", d.nom], ["Service", d.service], ...(d.grade ? ([["Grade", libelleGrade(d.grade)]] as [string, string][]) : [])] },
    bouton: { libelle: "Ouvrir la fiche", url: d.lien },
  }),

  selectionRecue: (d: { recruteur: string; entreprise: string; pays: string; profils: number; remplace: boolean; lien: string }): Message => ({
    sujet: `Sélection reçue : ${d.entreprise}`,
    apercu: `${d.recruteur} a envoyé une sélection de ${d.profils} profil${d.profils > 1 ? "s" : ""}.`,
    public: "cabinet",
    titre: "Une sélection de recruteur est arrivée",
    paragraphes: [`${d.recruteur} (${d.entreprise}) a envoyé sa sélection${d.remplace ? ". Elle remplace sa sélection précédente" : ""}.`],
    encadre: { lignes: [["Recruteur", d.recruteur], ["Entreprise", `${d.entreprise} · ${d.pays}`], ["Profils retenus", String(d.profils)]] },
    bouton: { libelle: "Voir la sélection", url: d.lien },
  }),

  finAccesProche: (d: { recruteur: string; entreprise: string; pays: string; dateFin: Date; lien: string }): Message => ({
    sujet: `Accès recruteur bientôt expiré : ${d.entreprise}`,
    apercu: `L'accès de ${d.recruteur} se termine le ${date(d.dateFin)}.`,
    public: "cabinet",
    titre: "Un accès recruteur se termine bientôt",
    paragraphes: [`L'accès de ${d.recruteur} se termine bientôt. Vous pouvez le prolonger depuis la plateforme si besoin.`],
    encadre: { lignes: [["Recruteur", d.recruteur], ["Entreprise", `${d.entreprise} · ${d.pays}`], ["Fin de l'accès", date(d.dateFin)]] },
    bouton: { libelle: "Gérer les accès", url: d.lien },
  }),

  demandeSuppression: (d: { demandeLe: Date; lien: string }): Message => ({
    sujet: "Demande de suppression d'un dossier",
    apercu: "Un candidat demande la suppression de son dossier.",
    public: "cabinet",
    titre: "Demande de suppression d'un dossier",
    paragraphes: [`Un candidat a demandé la suppression de son dossier le ${date(d.demandeLe)}. Merci de traiter sa demande.`],
    bouton: { libelle: "Traiter la demande", url: d.lien },
  }),

  test: (lien: string): Message => ({
    sujet: `E-mail de test de ${MARQUE.nom}`,
    apercu: "L'envoi des e-mails de la plateforme fonctionne.",
    public: "cabinet",
    titre: "L'envoi des e-mails fonctionne",
    paragraphes: ["Cet e-mail de test confirme que la plateforme peut envoyer ses notifications : confirmations de compte, pièces refusées, grades, sélections…"],
    important: "Si cet e-mail est arrivé dans les indésirables, marquez-le comme « Non spam » : cela aide les prochains envois.",
    bouton: { libelle: "Ouvrir la plateforme", url: lien },
  }),

  // ---------- Recruteur ----------

  identifiantsRecruteur: (d: { nom: string; email: string; motDePasse: string; dateFin: Date; lien: string; nouveau: boolean }): Message => ({
    sujet: d.nouveau ? `Votre nouveau mot de passe ${MARQUE.nom}` : `Votre accès à ${MARQUE.nom}`,
    apercu: `Vos identifiants pour consulter les profils de candidats, valables jusqu'au ${date(d.dateFin)}.`,
    public: "recruteur",
    titre: d.nouveau ? "Votre nouveau mot de passe" : "Votre accès est ouvert",
    paragraphes: [
      `Bonjour ${d.nom},`,
      d.nouveau
        ? "Voici votre nouveau mot de passe provisoire pour accéder à la plateforme."
        : "Le cabinet vous a ouvert un accès pour consulter des profils de candidats anonymisés et constituer votre sélection.",
    ],
    encadre: {
      titre: "Vos identifiants",
      lignes: [
        ["Identifiant", d.email],
        ["Mot de passe provisoire", d.motDePasse],
        ["Accès valable jusqu'au", `${date(d.dateFin)} inclus`],
      ],
    },
    bouton: { libelle: "Se connecter", url: d.lien },
    ensuite: ["Les coordonnées et les documents des candidats ne sont jamais affichés : le cabinet organise la mise en relation après l'envoi de votre sélection."],
  }),
};
