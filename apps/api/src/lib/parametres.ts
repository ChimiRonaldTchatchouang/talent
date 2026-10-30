import {
  PARAMETRES_CLASSEMENT_PAR_DEFAUT,
  schemaParametresClassement,
  type ParametresClassement,
} from "@bdt/shared";
import type { PrismaClient } from "@prisma/client";

export interface VersionParametres {
  version: number | null;
  valeurs: ParametresClassement;
  creeLe: Date | null;
}

/** Paramètres en vigueur : la version la plus récente, ou les valeurs par défaut s'il n'y en a pas encore. */
export async function parametresEnVigueur(db: PrismaClient): Promise<VersionParametres> {
  const derniere = await db.parametresClassement.findFirst({ orderBy: { id: "desc" } });
  if (!derniere) return { version: null, valeurs: PARAMETRES_CLASSEMENT_PAR_DEFAUT, creeLe: null };
  // Une clé ajoutée plus tard prend sa valeur par défaut.
  const valeurs = schemaParametresClassement.parse({ ...PARAMETRES_CLASSEMENT_PAR_DEFAUT, ...(derniere.valeurs as object) });
  return { version: derniere.id, valeurs, creeLe: derniere.creeLe };
}
