"use client";

import { ChakraProvider } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/toaster";
import { systeme } from "@/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={systeme}>
      {children}
      <Toaster />
    </ChakraProvider>
  );
}
