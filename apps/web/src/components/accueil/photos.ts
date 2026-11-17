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
 * - recruteurs : « recruiters team smiling »
 */
export type EmplacementPhoto = "accueil" | "coaching" | "entretien" | "langues" | "miseANiveau" | "appel" | "recruteurs";

/** `cadrage` : point de l'image à garder visible quand elle est recadrée (CSS object-position). */
export const PHOTOS_ACCUEIL: Record<EmplacementPhoto, { src: string; alt: string; cadrage?: string } | null> = {
  accueil: { src: "/images/accueil/accueil.jpg", alt: "Une jeune femme souriante, au premier plan d'une équipe de professionnels", cadrage: "50% 25%" },
  coaching: { src: "/images/accueil/coaching.jpg", alt: "Une jeune femme souriante qui regarde à travers une loupe", cadrage: "60% 30%" },
  entretien: { src: "/images/accueil/entretien.jpg", alt: "Un candidat en entretien face à une recruteuse", cadrage: "60% 40%" },
  langues: { src: "/images/accueil/langues.jpg", alt: "Une jeune femme souriante, sûre d'elle", cadrage: "30% 25%" },
  miseANiveau: { src: "/images/accueil/mise-a-niveau.jpg", alt: "Un professionnel expérimenté, souriant", cadrage: "50% 20%" },
  appel: { src: "/images/accueil/appel.jpg", alt: "Une équipe de professionnels prête à partir", cadrage: "35% 30%" },
  recruteurs: { src: "/images/accueil/recruteurs.jpg", alt: "Des recruteurs souriants, assis côte à côte", cadrage: "50% 40%" },
};
