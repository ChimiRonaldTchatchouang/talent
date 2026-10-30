import { MARQUE } from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";
import type { Config } from "./config.js";

export interface Email {
  a: string;
  sujet: string;
  texte: string;
}

/**
 * Expéditeur de test fourni par Resend, utilisé tant qu'aucune adresse du domaine du cabinet
 * n'est configurée. Attention : Resend ne livre alors qu'à l'adresse du titulaire du compte Resend.
 */
export const EXPEDITEUR_TEST_RESEND = `${MARQUE.nom} <onboarding@resend.dev>`;

export const expediteur = (config: Config) => config.EMAIL_EXPEDITEUR || EXPEDITEUR_TEST_RESEND;

/**
 * Envoie un e-mail par Resend : tous les e-mails de la plateforme passent par ici (confirmation de
 * compte, mot de passe, notifications). Sans clé configurée (mode démo), l'e-mail n'est pas envoyé :
 * il est seulement écrit dans le journal des e-mails, visible par les administrateurs.
 * Un échec d'envoi n'interrompt jamais l'action en cours : il est noté dans le journal.
 */
export async function envoyerEmail(db: PrismaClient, config: Config, email: Email): Promise<void> {
  if (!config.RESEND_API_KEY) {
    await db.emailEnvoye.create({ data: { destinataire: email.a, sujet: email.sujet, texte: email.texte, statut: "DEMO" } });
    return;
  }
  let erreur: string | null = null;
  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: expediteur(config), to: [email.a], subject: email.sujet, text: email.texte }),
      signal: AbortSignal.timeout(10000),
    });
    if (!reponse.ok) erreur = `Resend a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 300)}`;
  } catch (e) {
    erreur = `Resend injoignable : ${(e as Error).message}`;
  }
  await db.emailEnvoye.create({
    data: { destinataire: email.a, sujet: email.sujet, texte: email.texte, statut: erreur ? "ECHEC" : "ENVOYE", erreur },
  });
}

/** E-mails à tous les administrateurs actifs. */
export async function envoyerAuxAdmins(db: PrismaClient, config: Config, email: Omit<Email, "a">): Promise<void> {
  const admins = await db.utilisateur.findMany({ where: { role: "ADMIN", etat: "ACTIF", email: { not: null } } });
  for (const admin of admins) await envoyerEmail(db, config, { ...email, a: admin.email! });
}

const signature = `\n\n— L'équipe ${MARQUE.nom}`;

/** Modèles d'e-mails : courts, en français ; candidat tutoyé, administrateur vouvoyé. */
export const modeles = {
  compteCree: (lienConfirmation: string) => ({
    sujet: `Bienvenue sur ${MARQUE.nom}`,
    texte:
      `Bonjour,\n\nTon compte est créé. Pour confirmer ton adresse e-mail, ouvre ce lien (valable 3 jours) :\n${lienConfirmation}\n\n` +
      `Tu peux ensuite remplir ton dossier à ton rythme : tout est enregistré automatiquement.\n\n${MARQUE.avertissement}${signature}`,
  }),
  confirmationEmail: (lienConfirmation: string) => ({
    sujet: "Confirme ton adresse e-mail",
    texte: `Bonjour,\n\nPour confirmer ton adresse e-mail, ouvre ce lien (valable 3 jours) :\n${lienConfirmation}${signature}`,
  }),
  motDePasseOublie: (lien: string) => ({
    sujet: "Choisis un nouveau mot de passe",
    texte:
      `Bonjour,\n\nTu as demandé à changer ton mot de passe. Ouvre ce lien (valable 1 heure) :\n${lien}\n\n` +
      `Si tu n'as rien demandé, ignore ce message : ton mot de passe reste le même.${signature}`,
  }),
  dossierEnvoyeCandidat: (lienEspace: string) => ({
    sujet: "Ton dossier est bien envoyé",
    texte:
      `Bonjour,\n\nNous avons bien reçu ton dossier. Le cabinet va le vérifier.\n` +
      `Tu peux suivre ton dossier et le modifier à tout moment :\n${lienEspace}${signature}`,
  }),
  dossierEnvoyeAdmin: (nom: string, lien: string) => ({
    sujet: `Nouveau dossier reçu : ${nom}`,
    texte: `Bonjour,\n\nUn candidat vient d'envoyer son dossier : ${nom}.\nConsulter la plateforme :\n${lien}${signature}`,
  }),
};
