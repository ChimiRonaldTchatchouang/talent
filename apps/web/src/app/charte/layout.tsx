import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Charte graphique", robots: { index: false } };

export default function MiseEnPageCharte({ children }: { children: ReactNode }) {
  return children;
}
