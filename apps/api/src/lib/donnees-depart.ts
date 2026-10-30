import type { ElementComblable } from "@prisma/client";

/**
 * Données de départ des listes de référence (section 4, M2).
 * Listes proposées par défaut, à confirmer par le client (section 13, point 4) :
 * l'administrateur peut tout renommer, compléter ou désactiver.
 */
export const DOMAINES_ET_COMPETENCES: Record<string, string[]> = {
  BTP: ["Maçonnerie", "Coffrage", "Ferraillage", "Conduite d'engins", "Lecture de plans", "Carrelage"],
  Santé: ["Soins infirmiers", "Aide-soignant", "Soins aux personnes âgées", "Pharmacie", "Premiers secours"],
  Électricité: ["Électricité du bâtiment", "Électricité industrielle", "Câblage", "Énergie solaire", "Maintenance électrique"],
  Numérique: ["Développement web", "Réseaux informatiques", "Support informatique", "Bases de données", "Graphisme"],
  Logistique: ["Conduite poids lourd", "Cariste", "Gestion de stock", "Préparation de commandes", "Transit et douane"],
  Hôtellerie: ["Cuisine", "Service en salle", "Réception d'hôtel", "Entretien des chambres", "Pâtisserie"],
  Comptabilité: ["Comptabilité générale", "Paie", "Fiscalité", "Logiciel Sage", "Audit"],
};

/** Score minimum vide pour « Autre » : comparaison impossible, l'administrateur vérifie. */
export const TESTS_LANGUE: { nom: string; scoreMinimum: number | null }[] = [
  { nom: "TCF Canada", scoreMinimum: 400 },
  { nom: "TEF Canada", scoreMinimum: 400 },
  { nom: "IELTS", scoreMinimum: 6 },
  { nom: "TOEFL", scoreMinimum: 80 },
  { nom: "Autre", scoreMinimum: null },
];

export const SERVICES: { nom: string; description: string; duree: string; elementComble: ElementComblable | null }[] = [
  {
    nom: "Coaching",
    description: "Accompagnement personnalisé pour préparer ton projet de départ et ta vie professionnelle à l'étranger.",
    duree: "À préciser",
    elementComble: "COACHING",
  },
  {
    nom: "Formation aux tests de langue",
    description: "Préparation aux tests de langue demandés par les employeurs et les pays d'accueil.",
    duree: "À préciser",
    elementComble: "TEST_LANGUE",
  },
  {
    nom: "Séances de mise à niveau",
    description: "Remise à niveau en bureautique, outils numériques ou dans ton domaine de métier.",
    duree: "À préciser",
    elementComble: "NIVEAU",
  },
  {
    nom: "Préparation aux entretiens",
    description: "Simulations d'entretiens avec des employeurs étrangers et conseils pour réussir.",
    duree: "À préciser",
    elementComble: null,
  },
];

export const DIPLOMES: string[] = [
  "CAP/Certificat professionnel",
  "Baccalauréat",
  "BTS/DUT",
  "Licence",
  "Master/Ingénieur",
  "Doctorat",
  "Autre",
];
