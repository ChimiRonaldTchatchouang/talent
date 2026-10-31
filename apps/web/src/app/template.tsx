import type { ReactNode } from "react";

/** Transition douce à chaque changement de page. */
export default function Transition({ children }: { children: ReactNode }) {
  return <div className="bdt-page">{children}</div>;
}
