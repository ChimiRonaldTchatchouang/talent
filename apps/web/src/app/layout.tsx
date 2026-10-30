import { MARQUE } from "@bdt/shared";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: { default: MARQUE.nom, template: `%s · ${MARQUE.nom}` },
  description: MARQUE.accroche,
};

export const viewport: Viewport = { themeColor: "#0F2A4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={poppins.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
