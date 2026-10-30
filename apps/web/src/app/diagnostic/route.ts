// Page technique : vérifie que le site joint bien l'API. N'affiche aucun secret (l'adresse de l'API est publique).
export const dynamic = "force-dynamic";

export async function GET() {
  const brute = process.env.URL_API;
  const urlApi = (brute ?? "http://localhost:4000").trim().replace(/[./]+$/, "");
  let sante: { statut: number | null; reponse: string };
  try {
    const r = await fetch(`${urlApi}/sante`, { cache: "no-store", signal: AbortSignal.timeout(60000) });
    sante = { statut: r.status, reponse: (await r.text()).slice(0, 200) };
  } catch (e) {
    sante = { statut: null, reponse: `Injoignable : ${(e as Error).message}` };
  }
  return Response.json({
    urlApiConfiguree: brute ?? "(absente : localhost utilisé)",
    appelTeste: `${urlApi}/sante`,
    resultat: sante,
    verdict:
      sante.statut === 200
        ? "OK : le site joint l'API."
        : "Le site ne joint pas l'API : vérifiez URL_API dans Vercel (adresse exacte du service Render, en https, sans / final), puis redéployez.",
  });
}
