import { randomBytes } from "node:crypto";
import type { PrismaClient, TrancheExperience } from "@prisma/client";
import { recalculerGrade } from "./classement.js";
import type { Config } from "./config.js";
import { hacherMotDePasse } from "./mots-de-passe.js";
import { effacerCompte } from "./suppression.js";

/** Domaine réservé (RFC 2606) : aucune adresse de démonstration ne peut recevoir d'e-mail. */
export const DOMAINE_DEMO = "demo.invalid";
export const estAdresseDemo = (email: string) => email.endsWith(`@${DOMAINE_DEMO}`);

const PRENOMS = ["Awa", "Jean-Paul", "Clarisse", "Ibrahim", "Sandrine", "Paul", "Mireille", "Hervé", "Aïcha", "Boris", "Linda", "Samuel", "Nadège", "Moussa", "Estelle", "Franck", "Grâce", "Yannick", "Carine", "Didier"];
const NOMS = ["Ngono", "Mbarga", "Fotso", "Bello", "Etoa", "Nana", "Tchoumi", "Ewane", "Hamadou", "Kamga", "Nkeng", "Abena", "Mvondo", "Oumarou", "Njoya", "Tchatchoua", "Essomba", "Kouam", "Atangana", "Ndjock"];
const VILLES = ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Kribi", "Bamenda", "Limbé", "Ngaoundéré", "Buea", "Ebolowa"];
const METIERS: Record<string, string[]> = {
  BTP: ["Maçon", "Chef de chantier", "Coffreur"],
  Santé: ["Aide-soignante", "Infirmier", "Auxiliaire de vie"],
  Électricité: ["Électricien bâtiment", "Technicien solaire"],
  Numérique: ["Développeuse web", "Technicien réseaux"],
  Logistique: ["Chauffeur poids lourd", "Cariste"],
  Hôtellerie: ["Cuisinière", "Réceptionniste"],
  Comptabilité: ["Comptable", "Gestionnaire de paie"],
};
const TRANCHES: TrancheExperience[] = ["ANS_0_2", "ANS_3_5", "ANS_6_10", "ANS_10_PLUS"];
const PDF_DEMO = new Uint8Array(Buffer.from("%PDF-1.4\n% Document de démonstration\n"));

function motDePasse(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(12), (b) => a[b % a.length]).join("");
}

export async function etatDemo(db: PrismaClient) {
  const [candidats, recruteurs] = await Promise.all([
    db.utilisateur.count({ where: { estDemo: true, role: "CANDIDAT" } }),
    db.utilisateur.count({ where: { estDemo: true, role: "RECRUTEUR" } }),
  ]);
  return { candidats, recruteurs, actif: candidats + recruteurs > 0 };
}

/**
 * Crée ~20 candidats fictifs aux profils variés (tous les grades), un compte candidat et un compte
 * recruteur de test. Tout est marqué « démo » et s'efface d'un clic. Les mots de passe sont renvoyés une fois.
 */
export async function creerDonneesDemo(db: PrismaClient, config: Config, acteurId: string) {
  const [domaines, diplomes, tests, services] = await Promise.all([
    db.domaine.findMany({ where: { actif: true }, include: { competences: { where: { statut: "VALIDEE", actif: true } } } }),
    db.diplome.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    db.testLangue.findMany({ where: { actif: true, scoreMinimum: { not: null } } }),
    db.service.findMany({ where: { actif: true, elementComble: { not: null } } }),
  ]);
  const coaching = services.find((s) => s.elementComble === "COACHING");
  const mdpCandidat = motDePasse();
  const hashCandidat = await hacherMotDePasse(mdpCandidat);
  const hashAutres = await hacherMotDePasse(motDePasse());
  const maintenant = new Date();

  for (let i = 0; i < PRENOMS.length; i++) {
    const domaine = domaines[i % domaines.length]!;
    const profil = i % 5; // 0 : A, 1 : B, 2 : C, 3 : D, 4 : hors bassin (ou brouillon)
    const aDiplome = profil <= 2;
    const aTravaille = profil !== 4;
    const test = tests[i % tests.length];
    const scoreMin = test?.scoreMinimum?.toNumber() ?? 0;
    const brouillon = i === 19;
    const u = await db.utilisateur.create({
      data: {
        role: "CANDIDAT",
        estDemo: true,
        email: i === 0 ? `candidat@${DOMAINE_DEMO}` : `candidat${i + 1}@${DOMAINE_DEMO}`,
        motDePasseHash: i === 0 ? hashCandidat : hashAutres,
        dossier: {
          create: {
            statut: brouillon ? "BROUILLON" : "ENVOYE",
            envoyeLe: brouillon ? null : new Date(maintenant.getTime() - i * 86400000),
            certifieLe: brouillon ? null : maintenant,
            consentementTraitementLe: maintenant,
            consentementRecruteursLe: i % 7 === 6 ? null : maintenant,
            prenoms: PRENOMS[i],
            nom: `${NOMS[i]} (démo)`,
            dateNaissance: new Date(Date.UTC(1985 + (i % 15), i % 12, 1 + i)),
            sexe: i % 2 ? "HOMME" : "FEMME",
            nationalite: "Camerounaise",
            ville: VILLES[i % VILLES.length],
            telephoneContact: `+23769000${String(1000 + i).slice(-4)}`,
            languesParlees: i % 3 ? ["Français", "Anglais"] : ["Français"],
            aPasseport: i % 3 !== 2,
            passeportExpiration: i % 3 !== 2 ? new Date(Date.UTC(2027 + (i % 4), 5, 1)) : null,
            aDiplome,
            diplomeId: aDiplome ? diplomes[2 + (i % 3)]?.id : null,
            diplomeIntitule: aDiplome ? `Diplôme en ${domaine.nom.toLowerCase()}` : null,
            etablissement: aDiplome ? "Établissement de démonstration" : null,
            diplomeAnnee: aDiplome ? 2010 + (i % 12) : null,
            diplomePays: aDiplome ? "Cameroun" : null,
            aTestLangue: profil <= 1 || i % 4 === 0,
            testLangueId: test?.id,
            testScore: profil <= 1 ? scoreMin + 50 : scoreMin - 50,
            testDate: new Date(Date.UTC(2025, i % 12, 10)),
            aTravaille,
            domaineId: aTravaille ? domaine.id : null,
            metier: aTravaille ? METIERS[domaine.nom]?.[i % 2] ?? "Technicien" : null,
            trancheExperience: aTravaille ? (profil <= 1 ? "ANS_6_10" : TRANCHES[i % 4]) : null,
            bureautique: aTravaille ? (profil <= 1 ? "BON" : "MOYEN") : null,
            situation: i % 2 ? "MARIE" : "CELIBATAIRE",
            conjointNom: i % 2 ? "Conjoint (démo)" : null,
            conjointProfession: i % 2 ? "Commerçant" : null,
            conjointPasseport: i % 2 ? false : null,
            enfants: i % 2 ? "DEUX" : "AUCUN",
            partAvecAccompagnants: false,
            experiences: aTravaille
              ? { create: [{ ordre: 0, employeur: "Entreprise de démonstration", poste: METIERS[domaine.nom]?.[0] ?? "Technicien", debut: "2015-01", fin: null, ville: VILLES[i % VILLES.length] }] }
              : undefined,
            competences: aTravaille ? { create: domaine.competences.slice(0, 2).map((c) => ({ competenceId: c.id })) } : undefined,
          },
        },
      },
      include: { dossier: true },
    });
    const dossierId = u.dossier!.id;
    // Profils A : coaching réalisé et pièces vérifiées. Quelques pièces en attente pour la file de vérification.
    const types = profil === 0 ? (["IDENTITE", "DIPLOME", "ATTESTATION_LANGUE", "CV"] as const) : i % 3 === 1 ? (["IDENTITE", "CV"] as const) : ([] as const);
    for (const type of types) {
      const f = await db.fichier.create({ data: { contenu: PDF_DEMO, typeMime: "application/pdf", taille: PDF_DEMO.length, empreinte: "demo" } });
      await db.piece.create({ data: { dossierId, type, fichierId: f.id, nomFichier: `${type.toLowerCase()}-demo.pdf`, etat: profil === 0 ? "VERIFIEE" : "DEPOSEE" } });
    }
    if (profil === 0 && coaching) {
      await db.serviceCandidat.create({ data: { dossierId, serviceId: coaching.id, etat: "REALISE", realiseLe: maintenant } });
    } else if (profil === 1 && coaching && i % 2) {
      await db.serviceCandidat.create({ data: { dossierId, serviceId: coaching.id, etat: "INTERESSE", interesseLe: maintenant } });
    }
    await recalculerGrade(db, config, dossierId, "ADMIN", "Données de démonstration", acteurId);
    // La plupart des grades sont confirmés, pour que le recruteur de démonstration ait des profils à voir.
    if (!brouillon && i % 4 !== 3) await db.gradeDossier.update({ where: { dossierId }, data: { etat: "CONFIRME", auteurId: acteurId } });
  }

  const mdpRecruteur = motDePasse();
  await db.accesRecruteur.create({
    data: {
      entreprise: "Entreprise de démonstration",
      pays: "Canada",
      gradesVisibles: ["A", "B"],
      dateFin: new Date(maintenant.getTime() + 30 * 86400000),
      creeParId: acteurId,
      utilisateur: {
        create: { role: "RECRUTEUR", estDemo: true, nom: "Recruteur (démo)", email: `recruteur@${DOMAINE_DEMO}`, motDePasseHash: await hacherMotDePasse(mdpRecruteur) },
      },
    },
  });
  return {
    candidat: { identifiant: `candidat@${DOMAINE_DEMO}`, motDePasse: mdpCandidat },
    recruteur: { identifiant: `recruteur@${DOMAINE_DEMO}`, motDePasse: mdpRecruteur },
  };
}

/** Efface toutes les données de démonstration (comptes, dossiers, fichiers, accès, sélections). */
export async function effacerDonneesDemo(db: PrismaClient): Promise<number> {
  const comptes = await db.utilisateur.findMany({ where: { estDemo: true }, select: { id: true } });
  for (const c of comptes) await effacerCompte(db, c.id);
  return comptes.length;
}
