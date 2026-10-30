-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "elements_acquis" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "elements_faits" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "notes_internes" (
    "id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "auteur_id" UUID,
    "texte" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_internes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_internes_dossier_id_idx" ON "notes_internes"("dossier_id");

-- AddForeignKey
ALTER TABLE "notes_internes" ADD CONSTRAINT "notes_internes_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grades existants : résumé des éléments reconstruit à partir de l'explication enregistrée.
UPDATE "grades" SET
  "elements_faits" = ARRAY(SELECT e->>'element' FROM jsonb_array_elements("explication") e WHERE e->>'etat' = 'FAIT'),
  "elements_acquis" = ARRAY(SELECT e->>'element' FROM jsonb_array_elements("explication") e WHERE (e->>'acquis')::boolean);
