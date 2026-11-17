"use client";

import { ChakraProvider } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { EffetCurseur } from "@/components/effet-curseur";
import { EnregistrerServiceWorker } from "@/components/enregistrer-sw";
import { Toaster } from "@/components/toaster";
import { PreferencesProvider } from "@/lib/preferences";
import { systeme } from "@/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={systeme}>
      <PreferencesProvider>
        {children}
        <Toaster />
        <EnregistrerServiceWorker />
        <EffetCurseur />
      </PreferencesProvider>
    </ChakraProvider>
  );
}
