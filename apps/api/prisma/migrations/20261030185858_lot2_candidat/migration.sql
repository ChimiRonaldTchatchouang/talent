-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('BROUILLON', 'ENVOYE');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('FEMME', 'HOMME');

-- CreateEnum
CREATE TYPE "TrancheExperience" AS ENUM ('ANS_0_2', 'ANS_3_5', 'ANS_6_10', 'ANS_10_PLUS');

-- CreateEnum
CREATE TYPE "NiveauBureautique" AS ENUM ('DEBUTANT', 'MOYEN', 'BON');

-- CreateEnum
CREATE TYPE "Situation" AS ENUM ('CELIBATAIRE', 'MARIE', 'UNION_LIBRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "Enfants" AS ENUM ('AUCUN', 'UN', 'DEUX', 'TROIS_PLUS');

-- CreateEnum
CREATE TYPE "TypePiece" AS ENUM ('IDENTITE', 'DIPLOME', 'ATTESTATION_LANGUE', 'CERTIFICAT_TRAVAIL', 'CV');

-- CreateEnum
CREATE TYPE "EtatPiece" AS ENUM ('DEPOSEE', 'VERIFIEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TypeJeton" AS ENUM ('CONFIRMATION_EMAIL', 'REINITIALISATION');

-- CreateEnum
CREATE TYPE "StatutEmail" AS ENUM ('ENVOYE', 'ECHEC', 'DEMO');

-- CreateTable
CREATE TABLE "dossiers" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "statut" "StatutDossier" NOT NULL DEFAULT 'BROUILLON',
    "derniere_etape" TEXT,
    "envoye_le" TIMESTAMP(3),
    "certifie_le" TIMESTAMP(3),
    "consentement_traitement_le" TIMESTAMP(3) NOT NULL,
    "consentement_recruteurs_le" TIMESTAMP(3),
    "nom" TEXT,
    "prenoms" TEXT,
    "date_naissance" DATE,
    "sexe" "Sexe",
    "nationalite" TEXT,
    "ville" TEXT,
    "telephone_contact" TEXT,
    "email_contact" TEXT,
    "langues_parlees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "a_passeport" BOOLEAN,
    "passeport_expiration" DATE,
    "a_diplome" BOOLEAN,
    "diplome_id" UUID,
    "diplome_intitule" TEXT,
    "filiere" TEXT,
    "etablissement" TEXT,
    "diplome_annee" INTEGER,
    "diplome_pays" TEXT,
    "a_test_langue" BOOLEAN,
    "test_langue_id" UUID,
    "test_score" DECIMAL(7,1),
    "test_date" DATE,
    "a_travaille" BOOLEAN,
    "domaine_id" UUID,
    "metier" TEXT,
    "tranche_experience" "TrancheExperience",
    "bureautique" "NiveauBureautique",
    "situation" "Situation",
    "conjoint_nom" TEXT,
    "conjoint_profession" TEXT,
    "conjoint_passeport" BOOLEAN,
    "enfants" "Enfants",
    "part_avec_accompagnants" BOOLEAN,
    "nombre_accompagnants" INTEGER,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "ordre" INTEGER NOT NULL,
    "employeur" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "debut" TEXT,
    "fin" TEXT,
    "ville" TEXT,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_competences" (
    "dossier_id" UUID NOT NULL,
    "competence_id" UUID NOT NULL,

    CONSTRAINT "dossier_competences_pkey" PRIMARY KEY ("dossier_id","competence_id")
);

-- CreateTable
CREATE TABLE "pieces" (
    "id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "type" "TypePiece" NOT NULL,
    "etat" "EtatPiece" NOT NULL DEFAULT 'DEPOSEE',
    "motif_refus" TEXT,
    "fichier_id" UUID NOT NULL,
    "nom_fichier" TEXT NOT NULL,
    "depose_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifie_le" TIMESTAMP(3),
    "verifie_par_id" UUID,

    CONSTRAINT "pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_evenements" (
    "id" BIGSERIAL NOT NULL,
    "piece_id" UUID NOT NULL,
    "etat" "EtatPiece" NOT NULL,
    "motif" TEXT,
    "acteur_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_evenements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichiers" (
    "id" UUID NOT NULL,
    "contenu" BYTEA NOT NULL,
    "type_mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "empreinte" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jetons" (
    "id" TEXT NOT NULL,
    "type" "TypeJeton" NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "utilise_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jetons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" UUID NOT NULL,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "statut" "StatutEmail" NOT NULL,
    "erreur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglages" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglages_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_utilisateur_id_key" ON "dossiers"("utilisateur_id");

-- CreateIndex
CREATE INDEX "dossiers_statut_idx" ON "dossiers"("statut");

-- CreateIndex
CREATE INDEX "experiences_dossier_id_idx" ON "experiences"("dossier_id");

-- CreateIndex
CREATE UNIQUE INDEX "pieces_fichier_id_key" ON "pieces"("fichier_id");

-- CreateIndex
CREATE INDEX "pieces_dossier_id_idx" ON "pieces"("dossier_id");

-- CreateIndex
CREATE INDEX "pieces_etat_idx" ON "pieces"("etat");

-- CreateIndex
CREATE INDEX "pieces_evenements_piece_id_idx" ON "pieces_evenements"("piece_id");

-- CreateIndex
CREATE INDEX "jetons_utilisateur_id_idx" ON "jetons"("utilisateur_id");

-- CreateIndex
CREATE INDEX "emails_cree_le_idx" ON "emails"("cree_le");

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_diplome_id_fkey" FOREIGN KEY ("diplome_id") REFERENCES "diplomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_test_langue_id_fkey" FOREIGN KEY ("test_langue_id") REFERENCES "tests_langue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_domaine_id_fkey" FOREIGN KEY ("domaine_id") REFERENCES "domaines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_competences" ADD CONSTRAINT "dossier_competences_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_competences" ADD CONSTRAINT "dossier_competences_competence_id_fkey" FOREIGN KEY ("competence_id") REFERENCES "competences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_fichier_id_fkey" FOREIGN KEY ("fichier_id") REFERENCES "fichiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_evenements" ADD CONSTRAINT "pieces_evenements_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jetons" ADD CONSTRAINT "jetons_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
