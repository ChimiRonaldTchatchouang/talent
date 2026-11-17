import { Box, type BoxProps } from "@chakra-ui/react";

/** Carte blanche, coins arrondis, ombre légère (charte, section 12). */
export function Carte(props: BoxProps) {
  return <Box bg="surface" borderRadius="carte" boxShadow="carte" p={{ base: "4", md: "6" }} {...props} />;
}
