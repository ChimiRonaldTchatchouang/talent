import { CODES_ERREUR, type CodeErreur } from "@bdt/shared";

/** Erreur métier renvoyée au client au format standard, avec un message en français. */
export class ErreurMetier extends Error {
  constructor(
    public readonly statut: number,
    public readonly code: CodeErreur,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}

export const erreurs = {
  nonConnecte: () =>
    new ErreurMetier(401, CODES_ERREUR.NON_CONNECTE, "Vous devez être connecté pour accéder à cette page."),
  accesRefuse: () =>
    new ErreurMetier(403, CODES_ERREUR.ACCES_REFUSE, "Vous n'avez pas le droit d'effectuer cette action."),
  introuvable: (quoi = "L'élément demandé") =>
    new ErreurMetier(404, CODES_ERREUR.INTROUVABLE, `${quoi} est introuvable.`),
  conflit: (message: string, details?: Record<string, string>) => new ErreurMetier(409, CODES_ERREUR.CONFLIT, message, details),
  invalide: (message: string, details?: Record<string, string>) =>
    new ErreurMetier(400, CODES_ERREUR.DONNEES_INVALIDES, message, details),
};
