-- CreateEnum
CREATE TYPE "NiveauEvalue" AS ENUM ('NON_EVALUE', 'INSUFFISANT', 'SUFFISANT');

-- CreateEnum
CREATE TYPE "ValeurGrade" AS ENUM ('A', 'B', 'C', 'D', 'HORS_BASSIN');

-- CreateEnum
CREATE TYPE "EtatGrade" AS ENUM ('PROVISOIRE', 'CONFIRME', 'CORRIGE');

-- CreateEnum
CREATE TYPE "EtatService" AS ENUM ('SUGGERE', 'INTERESSE', 'ACCEPTE', 'EN_COURS', 'REALISE', 'ANNULE');

-- AlterTable
ALTER TABLE "dossiers" ADD COLUMN     "niveau_evalue" "NiveauEvalue" NOT NULL DEFAULT 'NON_EVALUE',
ADD COLUMN     "niveau_evalue_le" TIMESTAMP(3),
ADD COLUMN     "niveau_evalue_par_id" UUID;

-- CreateTable
CREATE TABLE "grades" (
    "dossier_id" UUID NOT NULL,
    "grade_calcule" "ValeurGrade" NOT NULL,
    "grade" "ValeurGrade" NOT NULL,
    "etat" "EtatGrade" NOT NULL DEFAULT 'PROVISOIRE',
    "regle" TEXT NOT NULL,
    "explication" JSONB NOT NULL,
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raison" TEXT,
    "auteur_id" UUID,
    "alerte" BOOLEAN NOT NULL DEFAULT false,
    "calcule_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("dossier_id")
);

-- CreateTable
CREATE TABLE "grades_historique" (
    "id" BIGSERIAL NOT NULL,
    "dossier_id" UUID NOT NULL,
    "grade" "ValeurGrade" NOT NULL,
    "grade_calcule" "ValeurGrade" NOT NULL,
    "etat" "EtatGrade" NOT NULL,
    "cause" TEXT NOT NULL,
    "raison" TEXT,
    "auteur_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_historique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services_candidats" (
    "id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "etat" "EtatService" NOT NULL,
    "interesse_le" TIMESTAMP(3),
    "accepte_le" TIMESTAMP(3),
    "en_cours_le" TIMESTAMP(3),
    "realise_le" TIMESTAMP(3),
    "annule_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_candidats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grades_grade_etat_idx" ON "grades"("grade", "etat");

-- CreateIndex
CREATE INDEX "grades_historique_dossier_id_idx" ON "grades_historique"("dossier_id");

-- CreateIndex
CREATE INDEX "services_candidats_etat_idx" ON "services_candidats"("etat");

-- CreateIndex
CREATE UNIQUE INDEX "services_candidats_dossier_id_service_id_key" ON "services_candidats"("dossier_id", "service_id");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades_historique" ADD CONSTRAINT "grades_historique_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_candidats" ADD CONSTRAINT "services_candidats_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_candidats" ADD CONSTRAINT "services_candidats_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
