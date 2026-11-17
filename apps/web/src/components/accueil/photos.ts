/**
 * Photos de la page d'accueil, par emplacement.
 *
 * Pour mettre une photo :
 * 1. déposer le fichier (JPEG, environ 1 600 px de large, moins de 300 Ko) dans `apps/web/public/images/accueil/` ;
 * 2. renseigner ci-dessous `src` (ex. "/images/accueil/accueil.jpg") et une description `alt` en français.
 * Tant que `src` vaut null, une illustration provisoire s'affiche : la page reste propre.
 *
 * Source conseillée : https://unsplash.com/fr (vérifier la mention « Licence Unsplash », gratuite, et non « Unsplash+ »).
 * Recherches suggérées pour chaque emplacement :
 * - accueil    : « african woman smiling portrait » (portrait souriant, fond uni, format vertical)
 * - coaching   : « african mentor meeting »
 * - entretien  : « job interview african »
 * - langues    : « african student studying »
 * - miseANiveau: « african worker laptop training »
 * - appel      : « african young man smiling laptop »
 */
export type EmplacementPhoto = "accueil" | "coaching" | "entretien" | "langues" | "miseANiveau" | "appel";

export const PHOTOS_ACCUEIL: Record<EmplacementPhoto, { src: string; alt: string } | null> = {
  accueil: null,
  coaching: null,
  entretien: null,
  langues: null,
  miseANiveau: null,
  appel: null,
};
