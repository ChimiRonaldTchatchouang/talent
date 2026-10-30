-- CreateEnum
CREATE TYPE "StatutSuppression" AS ENUM ('EN_ATTENTE', 'TRAITEE', 'ANNULEE');

-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN     "est_demo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "demandes_suppression" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID,
    "statut" "StatutSuppression" NOT NULL DEFAULT 'EN_ATTENTE',
    "demande_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_le" TIMESTAMP(3),
    "traite_par_id" UUID,

    CONSTRAINT "demandes_suppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demandes_suppression_statut_idx" ON "demandes_suppression"("statut");
