"use client";

import { Alert, Spinner, Stack } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CadreCompte, Lien } from "@/components/cadre-compte";
import { api, messageErreur } from "@/lib/api";

function Confirmation() {
  const jeton = useSearchParams().get("jeton") ?? "";
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const dejaFait = useRef(false);

  useEffect(() => {
    if (dejaFait.current) return;
    dejaFait.current = true;
    api<{ message: string }>("/auth/confirmer-email", { methode: "POST", corps: { jeton } })
      .then((r) => setResultat({ ok: true, message: r.message }))
      .catch((e) => setResultat({ ok: false, message: messageErreur(e) }));
  }, [jeton]);

  if (!resultat) return <Spinner color="emeraude.600" />;
  return (
    <Stack gap="4">
      <Alert.Root status={resultat.ok ? "success" : "warning"} borderRadius="carte">
        <Alert.Indicator />
        <Alert.Title>{resultat.message}</Alert.Title>
      </Alert.Root>
      <Lien href="/candidat">Aller à mon dossier</Lien>
    </Stack>
  );
}

export default function ConfirmerEmail() {
  return (
    <CadreCompte titre="Confirmation de ton e-mail">
      <Suspense>
        <Confirmation />
      </Suspense>
    </CadreCompte>
  );
}
