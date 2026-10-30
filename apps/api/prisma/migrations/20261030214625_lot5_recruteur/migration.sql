-- CreateEnum
CREATE TYPE "StatutLigneSelection" AS ENUM ('A_CONTACTER', 'MIS_EN_RELATION', 'RETENU', 'NON_RETENU');

-- CreateTable
CREATE TABLE "acces_recruteurs" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "entreprise" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "grades_visibles" "ValeurGrade"[],
    "domaines_visibles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "date_fin" DATE NOT NULL,
    "alerte_fin_envoyee" BOOLEAN NOT NULL DEFAULT false,
    "cree_par_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acces_recruteurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selections" (
    "id" UUID NOT NULL,
    "acces_id" UUID NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selections_lignes" (
    "selection_id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "ajoute_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selections_lignes_pkey" PRIMARY KEY ("selection_id","dossier_id")
);

-- CreateTable
CREATE TABLE "selections_envoyees" (
    "id" UUID NOT NULL,
    "acces_id" UUID NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "envoyee_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remplacee_le" TIMESTAMP(3),

    CONSTRAINT "selections_envoyees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selections_envoyees_lignes" (
    "id" UUID NOT NULL,
    "envoi_id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "statut" "StatutLigneSelection" NOT NULL DEFAULT 'A_CONTACTER',
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selections_envoyees_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations_recruteurs" (
    "id" BIGSERIAL NOT NULL,
    "acces_id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultations_recruteurs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acces_recruteurs_utilisateur_id_key" ON "acces_recruteurs"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "selections_acces_id_key" ON "selections"("acces_id");

-- CreateIndex
CREATE INDEX "selections_envoyees_acces_id_idx" ON "selections_envoyees"("acces_id");

-- CreateIndex
CREATE INDEX "selections_envoyees_lignes_envoi_id_idx" ON "selections_envoyees_lignes"("envoi_id");

-- CreateIndex
CREATE INDEX "consultations_recruteurs_dossier_id_idx" ON "consultations_recruteurs"("dossier_id");

-- AddForeignKey
ALTER TABLE "acces_recruteurs" ADD CONSTRAINT "acces_recruteurs_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections" ADD CONSTRAINT "selections_acces_id_fkey" FOREIGN KEY ("acces_id") REFERENCES "acces_recruteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections_lignes" ADD CONSTRAINT "selections_lignes_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections_lignes" ADD CONSTRAINT "selections_lignes_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections_envoyees" ADD CONSTRAINT "selections_envoyees_acces_id_fkey" FOREIGN KEY ("acces_id") REFERENCES "acces_recruteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections_envoyees_lignes" ADD CONSTRAINT "selections_envoyees_lignes_envoi_id_fkey" FOREIGN KEY ("envoi_id") REFERENCES "selections_envoyees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections_envoyees_lignes" ADD CONSTRAINT "selections_envoyees_lignes_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations_recruteurs" ADD CONSTRAINT "consultations_recruteurs_acces_id_fkey" FOREIGN KEY ("acces_id") REFERENCES "acces_recruteurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations_recruteurs" ADD CONSTRAINT "consultations_recruteurs_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
