import type { PrismaClient, Role } from "@prisma/client";
import { inject } from "vitest";
import { construireApp, type App } from "../src/app.js";
import { lireConfig } from "../src/lib/config.js";
import { chargerDonneesDepart } from "../src/lib/initialisation.js";
import { hacherMotDePasse } from "../src/lib/mots-de-passe.js";
import { creerPrisma } from "../src/lib/prisma.js";

export const MOT_DE_PASSE = "motdepasse-solide-1";

export async function demarrer(): Promise<{ app: App; prisma: PrismaClient }> {
  const url = inject("urlBaseTests");
  const prisma = creerPrisma(url);
  const app = await construireApp(lireConfig({ NODE_ENV: "test", DATABASE_URL: url }), prisma);
  await app.ready();
  return { app, prisma };
}

/** Vide les tables (sauf le journal, qui ne peut pas être vidé) et recharge les listes de départ. */
export async function viderBase(prisma: PrismaClient): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.serviceCandidat.deleteMany();
  await prisma.accesRecruteur.deleteMany();
  await prisma.noteInterne.deleteMany();
  await prisma.piece.deleteMany();
  await prisma.fichier.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.jeton.deleteMany();
  await prisma.emailEnvoye.deleteMany();
  await prisma.reglage.deleteMany({ where: { cle: { not: "secret_liens" } } });
  await prisma.parametresClassement.deleteMany();
  await prisma.competence.deleteMany();
  await prisma.domaine.deleteMany();
  await prisma.testLangue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.diplome.deleteMany();
  await prisma.utilisateur.deleteMany();
  await chargerDonneesDepart(prisma);
}

let compteur = 0;
export async function creerCompte(
  prisma: PrismaClient,
  role: Role,
  options: { email?: string; telephone?: string; estPrincipal?: boolean } = {},
) {
  compteur += 1;
  return prisma.utilisateur.create({
    data: {
      role,
      nom: `${role} ${compteur}`,
      email: options.telephone ? null : (options.email ?? `${role.toLowerCase()}${compteur}@exemple.cm`),
      telephone: options.telephone ?? null,
      estPrincipal: options.estPrincipal ?? false,
      motDePasseHash: await hacherMotDePasse(MOT_DE_PASSE),
      // Un recruteur n'existe qu'avec un accès (périmètre et date de fin).
      ...(role === "RECRUTEUR"
        ? { accesRecruteur: { create: { entreprise: "Test", pays: "Canada", gradesVisibles: ["A"], dateFin: new Date(Date.now() + 30 * 86400000) } } }
        : {}),
    },
  });
}

/** Se connecte et renvoie l'en-tête cookie à réutiliser. */
export async function connecter(app: App, identifiant: string, motDePasse = MOT_DE_PASSE): Promise<string> {
  const rep = await app.inject({ method: "POST", url: "/auth/connexion", payload: { identifiant, motDePasse } });
  if (rep.statusCode !== 200) throw new Error(`Connexion impossible : ${rep.body}`);
  const cookie = rep.cookies.find((c) => c.name === "bdt_session");
  if (!cookie) throw new Error("Cookie de session absent");
  return `bdt_session=${cookie.value}`;
}

/** Corps multipart/form-data contenant un seul fichier. */
export function corpsMultipart(contenu: Buffer, nom = "document.jpg", type = "image/jpeg") {
  const limite = "----bdt" + Math.random().toString(16).slice(2);
  const corps = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="fichier"; filename="${nom}"\r\nContent-Type: ${type}\r\n\r\n`),
    contenu,
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  return { payload: corps, headers: { "content-type": `multipart/form-data; boundary=${limite}` } };
}

export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
export const PDF = Buffer.from("%PDF-1.4\n% faux document de test\n");

/** Inscrit un candidat et renvoie le cookie de session. */
export async function inscrire(app: App, identifiant: string, recruteurs = true): Promise<string> {
  const rep = await app.inject({
    method: "POST",
    url: "/auth/inscription",
    payload: { identifiant, motDePasse: MOT_DE_PASSE, consentementTraitement: true, consentementRecruteurs: recruteurs },
  });
  if (rep.statusCode !== 201) throw new Error(`Inscription impossible : ${rep.body}`);
  const cookie = rep.cookies.find((c) => c.name === "bdt_session");
  return `bdt_session=${cookie!.value}`;
}

/** Extrait le jeton d'un lien (…?jeton=XXX) contenu dans le dernier e-mail envoyé à cette adresse. */
export async function jetonDuDernierEmail(prisma: PrismaClient, destinataire: string): Promise<string> {
  const email = await prisma.emailEnvoye.findFirstOrThrow({ where: { destinataire }, orderBy: { creeLe: "desc" } });
  const trouve = /jeton=([A-Za-z0-9_-]+)/.exec(email.texte);
  if (!trouve?.[1]) throw new Error("Aucun lien dans l'e-mail");
  return trouve[1];
}

export interface OptionsCandidat {
  prenoms?: string;
  nom?: string;
  ville?: string;
  domaine?: string;
  tranche?: string;
  aDiplome?: boolean;
  aPasseport?: boolean;
  passeportExpiration?: string;
  langues?: string[];
  envoyer?: boolean;
}

/** Inscrit un candidat et remplit tout son dossier (par défaut : grade B, BTP, Douala, envoyé). */
export async function candidatComplet(app: App, prisma: PrismaClient, email: string, o: OptionsCandidat = {}) {
  const cookie = await inscrire(app, email);
  const l = (await app.inject({ method: "GET", url: "/referentiels" })).json();
  const id = (liste: { id: string; nom: string }[], nom: string) => liste.find((x) => x.nom === nom)!.id;
  const etape = async (nom: string, donnees: object) => {
    const r = await app.inject({ method: "PUT", url: `/candidat/dossier/etapes/${nom}`, payload: { donnees, terminer: true }, headers: { cookie } });
    if (r.statusCode !== 200) throw new Error(`${nom} : ${r.body}`);
  };
  await etape("PERSONNEL", {
    nom: o.nom ?? "Ngono", prenoms: o.prenoms ?? "Awa", dateNaissance: "1995-04-12", sexe: "FEMME", nationalite: "Camerounaise",
    ville: o.ville ?? "Douala", telephoneContact: "699001122", languesParlees: o.langues ?? ["Français"],
    aPasseport: o.aPasseport ?? false, passeportExpiration: o.passeportExpiration ?? null,
  });
  await etape("DIPLOME", o.aDiplome === false ? { aDiplome: false } : {
    aDiplome: true, diplomeId: id(l.diplomes, "BTS/DUT"), diplomeIntitule: "BTS", etablissement: "IUT", diplomeAnnee: 2018, diplomePays: "Cameroun",
  });
  await etape("LANGUES", { aTestLangue: true, testLangueId: id(l.testsLangue, "TCF Canada"), testScore: 450, testDate: "2025-06-01" });
  await etape("TRAVAIL", {
    aTravaille: true, domaineId: id(l.domaines, o.domaine ?? "BTP"), metier: "Technicien", trancheExperience: o.tranche ?? "ANS_6_10", bureautique: "BON",
    experiences: [{ employeur: "Sogea", poste: "Technicien", debut: "2015-01", fin: null, ville: "Douala" }],
  });
  await etape("FAMILLE", { situation: "CELIBATAIRE", enfants: "AUCUN", partAvecAccompagnants: false });
  if (o.envoyer !== false) {
    const r = await app.inject({ method: "POST", url: "/candidat/dossier/envoyer", payload: { certifie: true }, headers: { cookie } });
    if (r.statusCode !== 200) throw new Error(`Envoi : ${r.body}`);
  }
  const dossier = await prisma.dossier.findFirstOrThrow({ where: { utilisateur: { email } } });
  return { cookie, dossierId: dossier.id };
}
