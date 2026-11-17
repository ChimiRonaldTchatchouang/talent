"use client";

import { useCallback } from "react";
import { useLangue } from "@/lib/preferences";

/**
 * Traduction anglaise des questions du dossier (écrans définis dans ecrans.ts) et des libellés de choix.
 * La clé est le texte français : un texte absent du dictionnaire reste en français.
 */
const EN: Record<string, string> = {
  // Personnel
  "Comment t'appelles-tu ?": "What's your name?",
  Nom: "Last name",
  "Prénom(s)": "First name(s)",
  "Parle-nous un peu de toi": "Tell us a bit about yourself",
  "Date de naissance": "Date of birth",
  Sexe: "Sex",
  Nationalité: "Nationality",
  Camerounaise: "Cameroonian",
  "Où peut-on te joindre ?": "How can we reach you?",
  "Ville de résidence": "City of residence",
  Téléphone: "Phone",
  "E-mail": "Email",
  "Quelles langues parles-tu ?": "Which languages do you speak?",
  "Choisis toutes les langues que tu parles.": "Choose all the languages you speak.",
  "Langues parlées": "Languages spoken",
  "As-tu un passeport ?": "Do you have a passport?",
  "Date d'expiration du passeport": "Passport expiry date",
  // Diplôme
  "As-tu un diplôme ?": "Do you have a degree?",
  "Ton dernier diplôme": "Your latest degree",
  Niveau: "Level",
  "Intitulé du diplôme": "Degree title",
  "BTS Génie civil": "BTS Civil engineering",
  "Filière ou spécialité": "Field or specialty",
  "Où l'as-tu obtenu ?": "Where did you obtain it?",
  Établissement: "School or university",
  "Année d'obtention": "Year obtained",
  Pays: "Country",
  // Langues
  "As-tu passé un test de langue ?": "Have you taken a language test?",
  "Par exemple TCF, TEF, IELTS ou TOEFL.": "For example TCF, TEF, IELTS or TOEFL.",
  "Ton test de langue": "Your language test",
  Test: "Test",
  "Score obtenu": "Score obtained",
  "Date du test": "Test date",
  // Travail
  "As-tu déjà travaillé ?": "Have you worked before?",
  "Ton métier": "Your trade",
  "Domaine principal": "Main field",
  Métier: "Trade / job",
  "Électricien bâtiment": "Building electrician",
  "Années d'expérience": "Years of experience",
  "Tes expériences": "Your work experience",
  "Ajoute tes emplois, du plus récent au plus ancien.": "Add your jobs, from the most recent to the oldest.",
  Expériences: "Experience",
  "Tes compétences": "Your skills",
  "Choisis tes compétences. Si une compétence manque, propose-la : le cabinet la validera.":
    "Choose your skills. If a skill is missing, suggest it: the agency will approve it.",
  Compétences: "Skills",
  "Ton niveau en bureautique": "Your office software level",
  "Word, Excel, e-mails, Internet…": "Word, Excel, email, Internet…",
  "Niveau en bureautique": "Office software level",
  "Je m'en sers rarement.": "I rarely use them.",
  "Je sais écrire un texte et envoyer un e-mail.": "I can write a document and send an email.",
  "Je suis à l'aise avec Word, Excel et Internet.": "I'm comfortable with Word, Excel and the Internet.",
  // Famille
  "Ta situation familiale": "Your family situation",
  Situation: "Situation",
  "Nom du conjoint": "Spouse's name",
  "Profession du conjoint": "Spouse's occupation",
  "Ton conjoint a-t-il un passeport ?": "Does your spouse have a passport?",
  "Combien d'enfants as-tu ?": "How many children do you have?",
  "Nombre d'enfants": "Number of children",
  "Partirais-tu avec quelqu'un ?": "Would anyone go with you?",
  "Des personnes qui partiraient avec toi (conjoint, enfants…).": "People who would leave with you (spouse, children…).",
  "Des personnes partiraient-elles avec toi ?": "Would anyone leave with you?",
  "Combien de personnes ?": "How many people?",
  // Récapitulatif
  Diplôme: "Degree",
  Filière: "Field",
  Année: "Year",
  Score: "Score",
  Date: "Date",
  "Test de langue": "Language test",
  Domaine: "Field",
  Expérience: "Experience",
  Employeurs: "Employers",
  Bureautique: "Office software",
  "A déjà travaillé": "Has worked before",
  Conjoint: "Spouse",
  "Passeport du conjoint": "Spouse's passport",
  Enfants: "Children",
  "Personnes qui partiraient avec toi": "People who would leave with you",
  Ville: "City",
  Passeport: "Passport",
  Oui: "Yes",
  Non: "No",
  // Libellés de choix (@bdt/shared)
  Femme: "Female",
  Homme: "Male",
  "0 à 2 ans": "0 to 2 years",
  "3 à 5 ans": "3 to 5 years",
  "6 à 10 ans": "6 to 10 years",
  "Plus de 10 ans": "More than 10 years",
  Débutant: "Beginner",
  Moyen: "Intermediate",
  Bon: "Good",
  Célibataire: "Single",
  "Marié(e)": "Married",
  "Union libre": "Cohabiting",
  Autre: "Other",
  "3 ou plus": "3 or more",
  Français: "French",
  Anglais: "English",
  Allemand: "German",
  Espagnol: "Spanish",
  Italien: "Italian",
  Portugais: "Portuguese",
  Arabe: "Arabic",
  Chinois: "Chinese",
};

/** t("Texte français") : le texte en anglais si l'anglais est choisi et connu, sinon le texte français. */
export function useTraduction() {
  const { langue } = useLangue();
  return useCallback((fr: string | undefined) => (fr === undefined ? undefined : langue === "en" ? (EN[fr] ?? fr) : fr), [langue]) as {
    (fr: string): string;
    (fr: string | undefined): string | undefined;
  };
}
