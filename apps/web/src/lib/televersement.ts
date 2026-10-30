"use client";

import { TAILLE_MAX_FICHIER } from "@bdt/shared";
import { api, ErreurClient } from "./api";

const COTE_MAX = 1800;
const QUALITE = 0.8;

/**
 * Compresse une photo avant l'envoi (pages légères, connexion mobile) : 1 800 px maximum, JPEG.
 * Les PDF sont envoyés tels quels.
 */
export async function compresserImage(fichier: File): Promise<File> {
  if (!fichier.type.startsWith("image/") || fichier.type === "image/gif") return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", QUALITE));
    if (!blob || (blob.size >= fichier.size && fichier.type === "image/jpeg")) return fichier;
    return new File([blob], fichier.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return fichier;
  }
}

/** Envoie un justificatif : lien de dépôt demandé à l'API, puis envoi direct du fichier. */
export async function televerser(type: string, fichier: File, pieceId?: string): Promise<{ message: string }> {
  const pret = await compresserImage(fichier);
  if (pret.size > TAILLE_MAX_FICHIER) throw new ErreurClient(413, "TROP_LOURD", "Ce fichier est trop lourd : 10 Mo maximum.");
  const { chemin, url } = await api<{ chemin: string; url: string | null }>("/candidat/pieces/autorisation", {
    methode: "POST",
    corps: { type, pieceId },
  });
  const formulaire = new FormData();
  formulaire.append("fichier", pret, pret.name);
  let reponse: Response;
  try {
    reponse = await fetch(url ?? `/api${chemin}`, { method: "POST", body: formulaire });
  } catch {
    throw new ErreurClient(0, "RESEAU", "Pas de connexion.");
  }
  const donnees = (await reponse.json().catch(() => null)) as { message?: string; erreur?: { code: string; message: string } } | null;
  if (!reponse.ok) {
    throw new ErreurClient(reponse.status, donnees?.erreur?.code ?? "INCONNU", donnees?.erreur?.message ?? "L'envoi a échoué. Réessaie.");
  }
  return { message: donnees?.message ?? "Fichier reçu." };
}
