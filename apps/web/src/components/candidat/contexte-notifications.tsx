"use client";

import { createContext, useContext } from "react";

/** Nombre de notifications non lues, partagé entre la barre d'onglets et les écrans de l'espace candidat. */
export const ContexteNotifications = createContext<{ nonLues: number; rafraichir: () => void }>({ nonLues: 0, rafraichir: () => undefined });
export const useNotificationsNonLues = () => useContext(ContexteNotifications);
