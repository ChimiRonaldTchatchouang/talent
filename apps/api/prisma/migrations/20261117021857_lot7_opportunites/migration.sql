-- CreateTable
CREATE TABLE "offres" (
    "id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "ville" TEXT,
    "domaine" TEXT,
    "type_contrat" TEXT,
    "description" TEXT NOT NULL,
    "grade_requis" "ValeurGrade" NOT NULL,
    "date_limite" DATE,
    "publiee" BOOLEAN NOT NULL DEFAULT true,
    "cree_par_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interets_offres" (
    "offre_id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interets_offres_pkey" PRIMARY KEY ("offre_id","dossier_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "lien" TEXT,
    "donnees" JSONB,
    "lue_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offres_publiee_idx" ON "offres"("publiee");

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_cree_le_idx" ON "notifications"("utilisateur_id", "cree_le");

-- AddForeignKey
ALTER TABLE "interets_offres" ADD CONSTRAINT "interets_offres_offre_id_fkey" FOREIGN KEY ("offre_id") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interets_offres" ADD CONSTRAINT "interets_offres_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
