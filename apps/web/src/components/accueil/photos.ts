/**
 * Photos de la page d'accueil, par emplacement.
 * Pour chaque emplacement : déposer le fichier (JPEG compressé, ~1600 px) dans public/images/accueil/
 * et renseigner `src`. Tant que `src` est vide, une illustration provisoire s'affiche.
 *
 * Photos repérées (licence Unsplash : usage commercial gratuit, sans attribution obligatoire) — à
 * télécharger dès que unsplash.com est autorisé dans l'environnement de travail. Vérifier sur chaque
 * page la mention « Unsplash License » (et non « Unsplash+ », payante) :
 * - accueil  : https://unsplash.com/photos/young-woman-smiling-at-desk-with-laptop-and-coffee-x1YcazlZ7N8
 * - equipe   : https://unsplash.com/photos/diverse-group-of-people-in-a-modern-office-meeting-5V6KbvRcnV8
 * - groupe   : https://unsplash.com/photos/four-diverse-colleagues-standing-together-in-an-office-bIp_G2qoP3Q
 * - entretien: https://unsplash.com/photos/young-woman-smiling-while-working-on-a-laptop-at-desk-UHfJI_lZoPo
 * - echange  : https://unsplash.com/photos/diverse-team-collaborates-around-a-table-in-office-fm4B1xWEIsU
 * - metier   : photo d'Emmanuel Ikwuegbu (chantier, Nigeria) — rechercher « black worker » sur Unsplash
 */
export type EmplacementPhoto = "accueil" | "equipe" | "groupe" | "entretien" | "echange" | "metier" | "formation";

export const PHOTOS_ACCUEIL: Record<EmplacementPhoto, { src: string; alt: string } | null> = {
  accueil: null,
  equipe: null,
  groupe: null,
  entretien: null,
  echange: null,
  metier: null,
  formation: null,
};
