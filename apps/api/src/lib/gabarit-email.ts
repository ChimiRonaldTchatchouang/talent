import { LIBELLES_GRADES, MARQUE, type Grade } from "@bdt/shared";

/**
 * Gabarit des e-mails de la plateforme, aux couleurs de la charte (section 12).
 * Mise en page en tableaux et styles en ligne : c'est ce que lisent correctement Gmail, Outlook et
 * Apple Mail. Aucune image (le logo est en texte) : l'e-mail reste lisible quand les images sont
 * bloquées, et un e-mail sans image distante est mieux reçu par les filtres anti-spam.
 * Chaque e-mail est aussi produit en texte brut (version alternative jointe à l'envoi).
 */

/** Destinataire : le candidat est tutoyé ; le cabinet et le recruteur sont vouvoyés. */
export type Public = "candidat" | "cabinet" | "recruteur";

export interface Message {
  sujet: string;
  /** Texte d'aperçu affiché sous le sujet dans la boîte de réception. */
  apercu: string;
  public: Public;
  titre: string;
  paragraphes: string[];
  /** Grade mis en avant (pastille de couleur avec la lettre). */
  grade?: Grade;
  /** Encadré d'informations (libellé → valeur). */
  encadre?: { titre?: string; lignes: [string, string][] };
  /** Liste à puces (ex. pièces manquantes). */
  liste?: { titre: string; elements: string[] };
  /** Message important (fond menthe). */
  important?: string;
  bouton?: { libelle: string; url: string };
  /** Paragraphes après le bouton. */
  ensuite?: string[];
}

export interface Contexte {
  urlSite: string;
  telephoneCabinet: string | null;
  emailCabinet: string | null;
}

const C = {
  nuit: "#0F2A4A",
  emeraude: "#006D33",
  menthe: "#7CF5A5",
  fond: "#F8F9FF",
  brume: "#EEF2FB",
  encre: "#101B2B",
  gris: "#56637A",
  trait: "#DDE3F0",
};
const GRADE_COULEUR: Record<Grade, string> = { A: "#006D33", B: "#0F2A4A", C: "#D97706", D: "#912CEA", HORS_BASSIN: "#56637A" };
const POLICE = "Poppins, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Échappe le texte inséré dans le HTML (noms, motifs, messages saisis par les utilisateurs). */
export function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const piedTexte = (p: Public) =>
  p === "candidat"
    ? `Tu reçois cet e-mail parce que tu as un compte sur ${MARQUE.nom}.`
    : p === "recruteur"
      ? `Vous recevez cet e-mail parce que le cabinet vous a ouvert un accès à ${MARQUE.nom}.`
      : `Vous recevez cet e-mail en tant qu'administrateur de ${MARQUE.nom}.`;

function coordonnees(ctx: Contexte): string[] {
  return [ctx.telephoneCabinet && `Téléphone du cabinet : ${ctx.telephoneCabinet}`, ctx.emailCabinet && `E-mail : ${ctx.emailCabinet}`].filter(
    (x): x is string => !!x,
  );
}

function paragrapheHtml(t: string, couleur = C.encre): string {
  return `<p style="margin:0 0 16px 0;font-family:${POLICE};font-size:16px;line-height:1.6;color:${couleur};">${echapper(t)}</p>`;
}

/** Produit l'e-mail en HTML et en texte brut. */
export function rendreEmail(m: Message, ctx: Contexte): { html: string; texte: string } {
  const site = ctx.urlSite.replace(/\/+$/, "");
  const blocs: string[] = [];

  blocs.push(
    `<h1 style="margin:0 0 20px 0;font-family:${POLICE};font-size:24px;line-height:1.3;font-weight:700;color:${C.nuit};">${echapper(m.titre)}</h1>`,
  );
  for (const p of m.paragraphes) blocs.push(paragrapheHtml(p));

  if (m.grade) {
    const g = LIBELLES_GRADES[m.grade];
    blocs.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr>
      <td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;border-radius:28px;background:${GRADE_COULEUR[m.grade]};color:#FFFFFF;font-family:${POLICE};font-size:26px;font-weight:700;">${echapper(g.lettre)}</td>
      <td style="padding-left:14px;font-family:${POLICE};">
        <div style="font-size:18px;font-weight:700;color:${C.nuit};">${m.grade === "HORS_BASSIN" ? "Hors bassin" : `Grade ${m.grade}`}</div>
        <div style="font-size:15px;color:${C.gris};">${echapper(g.libelle)}</div>
      </td></tr></table>`);
  }

  if (m.encadre) {
    const lignes = m.encadre.lignes
      .map(
        ([l, v]) => `<tr>
        <td valign="top" style="padding:6px 12px 6px 0;font-family:${POLICE};font-size:14px;color:${C.gris};white-space:nowrap;">${echapper(l)}</td>
        <td valign="top" style="padding:6px 0;font-family:${POLICE};font-size:15px;font-weight:600;color:${C.encre};">${echapper(v)}</td></tr>`,
      )
      .join("");
    blocs.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;background:${C.brume};border-radius:12px;"><tr><td style="padding:16px 20px;">
      ${m.encadre.titre ? `<div style="font-family:${POLICE};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${C.nuit};padding-bottom:6px;">${echapper(m.encadre.titre)}</div>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">${lignes}</table>
    </td></tr></table>`);
  }

  if (m.liste && m.liste.elements.length) {
    blocs.push(`<p style="margin:0 0 8px 0;font-family:${POLICE};font-size:16px;font-weight:600;color:${C.nuit};">${echapper(m.liste.titre)}</p>
      <ul style="margin:0 0 20px 0;padding-left:22px;font-family:${POLICE};font-size:15px;line-height:1.7;color:${C.encre};">${m.liste.elements.map((e) => `<li>${echapper(e)}</li>`).join("")}</ul>`);
  }

  if (m.important) {
    blocs.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr>
      <td style="padding:14px 18px;background:${C.menthe};border-radius:12px;font-family:${POLICE};font-size:15px;line-height:1.5;font-weight:600;color:${C.nuit};">${echapper(m.important)}</td></tr></table>`);
  }

  if (m.bouton) {
    const url = echapper(m.bouton.url);
    // Bouton « blindé » : une cellule de tableau colorée, qui s'affiche aussi dans Outlook.
    blocs.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px 0;"><tr>
      <td align="center" bgcolor="${C.emeraude}" style="border-radius:999px;background:${C.emeraude};">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${POLICE};font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">${echapper(m.bouton.libelle)}</a>
      </td></tr></table>
      <p style="margin:0 0 20px 0;font-family:${POLICE};font-size:13px;line-height:1.5;color:${C.gris};">${m.public === "candidat" ? "Si le bouton ne marche pas, copie ce lien dans ton navigateur :" : "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :"}<br><a href="${url}" target="_blank" style="color:${C.emeraude};word-break:break-all;">${url}</a></p>`);
  }

  for (const p of m.ensuite ?? []) blocs.push(paragrapheHtml(p));

  const contacts = coordonnees(ctx);
  const pied = [
    piedTexte(m.public),
    ...(m.public === "candidat" ? [MARQUE.avertissement] : []),
    ...contacts,
  ];

  const html = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${echapper(m.sujet)}</title>
</head>
<body style="margin:0;padding:0;background:${C.fond};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.fond};font-size:1px;line-height:1px;">${echapper(m.apercu)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fond};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td style="background:${C.nuit};border-radius:16px 16px 0 0;padding:22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;border-radius:10px;background:${C.menthe};font-family:${POLICE};font-size:14px;font-weight:700;color:${C.nuit};">BT</td>
          <td style="padding-left:12px;font-family:${POLICE};font-size:18px;font-weight:700;color:#FFFFFF;">${echapper(MARQUE.nom)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;line-height:4px;font-size:4px;background:${C.menthe};">&nbsp;</td></tr>
      <tr><td style="background:#FFFFFF;padding:32px 28px 28px 28px;border:1px solid ${C.trait};border-top:0;border-radius:0 0 16px 16px;">
        ${blocs.join("\n")}
        <p style="margin:8px 0 0 0;font-family:${POLICE};font-size:16px;line-height:1.6;color:${C.encre};">${m.public === "candidat" ? "À bientôt," : "Cordialement,"}<br><strong>L'équipe ${echapper(MARQUE.nom)}</strong></p>
      </td></tr>
      <tr><td style="padding:20px 28px 8px 28px;font-family:${POLICE};font-size:12px;line-height:1.6;color:${C.gris};text-align:center;">
        ${pied.map((l) => echapper(l)).join("<br>")}<br>
        <a href="${echapper(site)}" target="_blank" style="color:${C.gris};text-decoration:underline;">${echapper(site.replace(/^https?:\/\//, ""))}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // Version texte : même contenu, lisible sans HTML.
  const texte = [
    m.titre,
    "",
    ...m.paragraphes.flatMap((p) => [p, ""]),
    ...(m.grade ? [`${m.grade === "HORS_BASSIN" ? "Hors bassin" : `Grade ${m.grade}`} : ${LIBELLES_GRADES[m.grade].libelle}`, ""] : []),
    ...(m.encadre ? [...(m.encadre.titre ? [m.encadre.titre] : []), ...m.encadre.lignes.map(([l, v]) => `- ${l} : ${v}`), ""] : []),
    ...(m.liste && m.liste.elements.length ? [m.liste.titre, ...m.liste.elements.map((e) => `- ${e}`), ""] : []),
    ...(m.important ? [m.important, ""] : []),
    ...(m.bouton ? [`${m.bouton.libelle} : ${m.bouton.url}`, ""] : []),
    ...(m.ensuite ?? []).flatMap((p) => [p, ""]),
    m.public === "candidat" ? "À bientôt," : "Cordialement,",
    `L'équipe ${MARQUE.nom}`,
    "",
    "--",
    ...pied,
    site,
  ].join("\n");

  return { html, texte };
}
