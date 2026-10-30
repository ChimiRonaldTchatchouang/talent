import { MARQUE } from "@bdt/shared";
import { Box, HStack, Text } from "@chakra-ui/react";

/** Logo provisoire : remplacé par le logo définitif quand le client le fournira. */
export function Logo({ clair = false }: { clair?: boolean }) {
  return (
    <HStack gap="2.5">
      <Box
        w="9"
        h="9"
        borderRadius="10px"
        bg="menthe"
        color="nuit"
        display="grid"
        placeItems="center"
        fontWeight="700"
        fontSize="sm"
        aria-hidden
      >
        BT
      </Box>
      <Text fontWeight="700" fontSize="lg" color={clair ? "white" : "nuit"}>
        {MARQUE.nom}
      </Text>
    </HStack>
  );
}
