-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDAT', 'ADMIN', 'RECRUTEUR');

-- CreateEnum
CREATE TYPE "EtatCompte" AS ENUM ('ACTIF', 'DESACTIVE');

-- CreateEnum
CREATE TYPE "StatutCompetence" AS ENUM ('VALIDEE', 'PROPOSEE', 'REJETEE');

-- CreateEnum
CREATE TYPE "ElementComblable" AS ENUM ('TEST_LANGUE', 'COACHING', 'NIVEAU');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "nom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "mot_de_passe_hash" TEXT NOT NULL,
    "etat" "EtatCompte" NOT NULL DEFAULT 'ACTIF',
    "est_principal" BOOLEAN NOT NULL DEFAULT false,
    "email_verifie_le" TIMESTAMP(3),
    "tentatives_echouees" INTEGER NOT NULL DEFAULT 0,
    "bloque_jusqu_a" TIMESTAMP(3),
    "derniere_connexion" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,
    "cree_par_id" UUID,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal" (
    "id" BIGSERIAL NOT NULL,
    "acteur_id" UUID,
    "role" "Role",
    "action" TEXT NOT NULL,
    "cible_type" TEXT,
    "cible_id" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domaines" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domaines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competences" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "domaine_id" UUID NOT NULL,
    "statut" "StatutCompetence" NOT NULL DEFAULT 'VALIDEE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "proposee_par_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests_langue" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "score_minimum" DECIMAL(7,1),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_langue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "duree" TEXT NOT NULL DEFAULT '',
    "element_comble" "ElementComblable",
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diplomes" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diplomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres_classement" (
    "id" SERIAL NOT NULL,
    "valeurs" JSONB NOT NULL,
    "cree_par_id" UUID,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametres_classement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE INDEX "sessions_utilisateur_id_idx" ON "sessions"("utilisateur_id");

-- CreateIndex
CREATE INDEX "journal_cree_le_idx" ON "journal"("cree_le");

-- CreateIndex
CREATE INDEX "journal_cible_type_cible_id_idx" ON "journal"("cible_type", "cible_id");

-- CreateIndex
CREATE UNIQUE INDEX "domaines_nom_key" ON "domaines"("nom");

-- CreateIndex
CREATE INDEX "competences_statut_idx" ON "competences"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "competences_domaine_id_nom_key" ON "competences"("domaine_id", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "tests_langue_nom_key" ON "tests_langue"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "services_nom_key" ON "services"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "diplomes_nom_key" ON "diplomes"("nom");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences" ADD CONSTRAINT "competences_domaine_id_fkey" FOREIGN KEY ("domaine_id") REFERENCES "domaines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences" ADD CONSTRAINT "competences_proposee_par_id_fkey" FOREIGN KEY ("proposee_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres_classement" ADD CONSTRAINT "parametres_classement_cree_par_id_fkey" FOREIGN KEY ("cree_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Journal en ajout seulement : aucune modification ni suppression possible (section 3 et M11).
CREATE FUNCTION journal_interdire_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Le journal des actions ne peut pas être modifié ni supprimé.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_ajout_seulement
  BEFORE UPDATE OR DELETE ON "journal"
  FOR EACH ROW EXECUTE FUNCTION journal_interdire_modification();

CREATE TRIGGER journal_pas_de_vidage
  BEFORE TRUNCATE ON "journal"
  FOR EACH STATEMENT EXECUTE FUNCTION journal_interdire_modification();

-- Un seul compte par e-mail ou téléphone, sans tenir compte de la casse de l'e-mail (R-17).
CREATE UNIQUE INDEX "utilisateurs_email_minuscules_key" ON "utilisateurs" (lower("email"));
