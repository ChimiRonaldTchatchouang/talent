"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CLIQUABLE = "a, button, [role='button'], input, select, textarea, label, .bdt-cliquable";

/**
 * Effet de curseur, visible aussi sur téléphone :
 * - au toucher (écran tactile) : une onde verte part du doigt à chaque appui ;
 * - à la souris : un anneau suit le curseur et grossit au-dessus des éléments cliquables.
 * Le curseur du système reste affiché (accessibilité). Rien n'est animé si le téléphone demande moins de mouvement.
 * Pas d'effet dans les espaces administrateur et recruteur (outils de travail).
 */
export function EffetCurseur() {
  const chemin = usePathname();
  const actif = !chemin.startsWith("/admin") && !chemin.startsWith("/recruteur");

  useEffect(() => {
    if (!actif || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const calque = document.createElement("div");
    calque.className = "bdt-calque-curseur";
    calque.setAttribute("aria-hidden", "true");
    document.body.appendChild(calque);

    // Onde au toucher (et au clic) : un cercle qui s'agrandit et s'efface.
    const onde = (e: PointerEvent) => {
      const o = document.createElement("span");
      o.className = e.pointerType === "touch" ? "bdt-onde bdt-onde-toucher" : "bdt-onde";
      o.style.left = `${e.clientX}px`;
      o.style.top = `${e.clientY}px`;
      calque.appendChild(o);
      o.addEventListener("animationend", () => o.remove());
    };
    window.addEventListener("pointerdown", onde, { passive: true });

    // Anneau qui suit la souris (seulement avec un pointeur précis).
    const souris = window.matchMedia("(pointer: fine)").matches;
    let anneau: HTMLSpanElement | null = null;
    let image = 0;
    let x = -100,
      y = -100,
      ax = -100,
      ay = -100;
    const suivre = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !anneau) return;
      x = e.clientX;
      y = e.clientY;
      anneau.dataset.visible = "true";
      anneau.dataset.survol = String(!!(e.target as Element | null)?.closest?.(CLIQUABLE));
    };
    const animer = () => {
      // L'anneau rattrape le curseur en douceur.
      ax += (x - ax) * 0.2;
      ay += (y - ay) * 0.2;
      if (anneau) anneau.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
      image = requestAnimationFrame(animer);
    };
    const quitter = () => anneau && (anneau.dataset.visible = "false");
    if (souris) {
      anneau = document.createElement("span");
      anneau.className = "bdt-anneau";
      calque.appendChild(anneau);
      window.addEventListener("pointermove", suivre, { passive: true });
      document.documentElement.addEventListener("pointerleave", quitter);
      image = requestAnimationFrame(animer);
    }

    return () => {
      window.removeEventListener("pointerdown", onde);
      window.removeEventListener("pointermove", suivre);
      document.documentElement.removeEventListener("pointerleave", quitter);
      cancelAnimationFrame(image);
      calque.remove();
    };
  }, [actif]);

  return null;
}
