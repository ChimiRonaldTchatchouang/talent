# Bassin de Talents — Dossier d'implémentation

> Document de référence remis à Claude Code pour construire le MVP.
> Client : M. Michel (cabinet de placement à l'international, Cameroun).
> Réalisation : Nextiaa, chef de projet Ronald Chimi.
> Version : 30 octobre 2026.

---

## 0. Prompt de lancement

À coller dans Claude Code, avec ce document et le dossier `maquettes/` dans le répertoire de travail.

```
Tu es le développeur principal du projet « Bassin de Talents » pour Nextiaa.

Lis entièrement le fichier SPECIFICATION.md avant d'écrire la moindre ligne de code.
Les captures du dossier maquettes/ montrent l'apparence attendue des écrans.

Ta mission :
1. Choisir une technologie simple, fiable et facile à héberger gratuitement
   (ou sur l'hébergement Hostinger déjà payé par le client). Explique ton choix
   en 10 lignes maximum dans le README, avec le coût mensuel (objectif : 0 FCFA).
2. Créer le dépôt Git du projet sur GitHub (privé, nom : bassin-de-talents)
   en suivant la section 11 de la spécification.
3. Implémenter le MVP lot par lot, dans l'ordre de la section 10.
   À la fin de chaque lot : tests qui passent, commit, fusion dans main,
   et un court résumé de ce qui est fait et de ce qui reste.
4. Respecter strictement les règles métier (section 6) et les règles de
   sécurité (section 8). Elles priment sur toute autre considération.
5. Quand une information manque, applique la valeur par défaut indiquée
   dans la spécification, rends-la modifiable par l'administrateur, et note-la
   dans le fichier DECISIONS.md. Ne bloque pas le travail pour une question.

Commence par me présenter ta proposition de technologie et d'hébergement,
puis crée le dépôt et attaque le lot 1.
```

---

## 1. Le projet en clair

M. Michel met en relation des travailleurs camerounais avec des entreprises qui recrutent à l'international. Il propose aussi quatre services :

- le coaching,
- la préparation aux entretiens avec les employeurs étrangers,
- la formation aux tests de langue,
- les séances de mise à niveau (bureautique, outils numériques, domaine précis).

Les candidats n'arrivent pas tous avec le même niveau de préparation. La plateforme doit :

1. permettre à chaque candidat de déposer son profil une seule fois,
2. le classer automatiquement dans un **grade** (A, B, C ou D),
3. lui montrer ce qui lui manque et les services du cabinet qui l'aideront,
4. permettre au cabinet de voir tout le vivier, de filtrer, de vérifier et de confirmer,
5. permettre au cabinet d'ouvrir un accès limité à un recruteur pour qu'il fasse sa sélection.

**La question à laquelle la plateforme répond :**
« Parmi toutes les personnes inscrites, qui puis-je présenter demain à un employeur, et que dois-je proposer aux autres ? »

**Ce que la plateforme ne promet pas :** ni emploi, ni visa, ni départ. Cette phrase doit apparaître sur l'espace candidat.

---

## 2. Contraintes générales

| Sujet | Exigence |
|---|---|
| Coût | Services gratuits uniquement pour le MVP. Seul le domaine et l'hébergement Hostinger (déjà payés) sont disponibles. |
| Technologie | Libre, au choix du développeur. Critères : facile à héberger, peu de maintenance, une seule base de code pour les trois espaces. |
| Support candidat | Application web pensée d'abord pour le téléphone, installable sur l'écran d'accueil (PWA). Pas d'application dans les stores. |
| Support admin et recruteur | Application web sur ordinateur, utilisable aussi sur tablette. |
| Langue | Interface en français. Le candidat est tutoyé. L'administrateur et le recruteur sont vouvoyés. |
| Réseau | Pages légères, adaptées à une connexion mobile moyenne au Cameroun. Images compressées à l'envoi. |
| Notifications | Par e-mail uniquement (les SMS sont payants, hors MVP). |
| Données personnelles | Conformité à la loi camerounaise n° 2024/017 sur les données personnelles (consentement, droit de suppression, accès limité). |
| Hors MVP | Paiement en ligne, messagerie interne, offres d'emploi, visioconférence, cours en ligne, application native. |

---

## 3. Les utilisateurs et leurs droits

| Rôle | Qui | Ce qu'il peut faire | Ce qu'il ne peut jamais faire |
|---|---|---|---|
| **Candidat** | Toute personne qui s'inscrit | Créer son compte, remplir et modifier son dossier, déposer ses pièces, voir son grade et les services, signaler son intérêt, demander la suppression de son dossier | Voir le dossier d'un autre, modifier son grade, marquer un service comme réalisé |
| **Administrateur** | M. Michel et son équipe | Tout voir, vérifier les pièces, confirmer ou corriger les grades, suivre les services, gérer les listes de référence, créer les accès recruteurs, exporter | Supprimer le journal des actions |
| **Recruteur invité** | Recruteur choisi par le cabinet | Voir uniquement les profils de son périmètre, filtrer, constituer et envoyer une sélection | Voir le téléphone, l'e-mail, l'adresse ou les pièces d'un candidat ; modifier quoi que ce soit ; se connecter après la date de fin |

Un compte administrateur « principal » est créé à l'installation. Il peut créer d'autres comptes administrateurs.

---

## 4. Les modules

### M1 — Comptes et accès
- Inscription candidat : numéro de téléphone (format +237 par défaut) **ou** e-mail, et mot de passe (8 caractères minimum).
- Un même téléphone ou un même e-mail ne peut créer qu'un seul compte.
- Connexion, déconnexion, mot de passe oublié (lien par e-mail ; si le candidat n'a qu'un téléphone, il contacte le cabinet, qui réinitialise depuis l'espace admin).
- Comptes admin et recruteur créés uniquement par un administrateur.
- Les droits sont vérifiés côté serveur sur chaque action, jamais seulement dans l'interface.

### M2 — Listes de référence (modifiables par l'administrateur)
- **Domaines** (ex. BTP, Santé, Électricité, Numérique, Logistique, Hôtellerie, Comptabilité).
- **Compétences**, rattachées à un domaine.
- **Tests de langue** avec score minimum accepté (ex. TCF Canada, TEF, IELTS, TOEFL, Autre).
- **Services du cabinet** : nom, description, durée, élément du grade qu'il comble (coaching, test de langue, niveau).
- **Diplômes** (niveaux) : Baccalauréat, BTS/DUT, Licence, Master/Ingénieur, Doctorat, CAP/Certificat professionnel, Autre.
- **Paramètres du classement** (voir section 6).
- Les propositions de nouvelles compétences faites par les candidats arrivent dans une file « à valider ».

Chaque élément peut être ajouté, renommé ou désactivé. Un élément désactivé reste affiché dans les dossiers qui l'utilisent déjà.

### M3 — Dossier candidat (formulaires dynamiques)
Quatre groupes, plus les justificatifs :

1. **Informations personnelles** : nom, prénom(s), date de naissance, sexe, nationalité, ville de résidence, téléphone, e-mail, langues parlées (choix multiple), passeport oui/non (si oui : date d'expiration).
2. **Informations académiques** (affiché seulement si « As-tu un diplôme ? » = Oui) : niveau du dernier diplôme, intitulé, filière, établissement, année, pays. Puis « As-tu passé un test de langue ? » ; si oui : test, score, date.
3. **Informations professionnelles** (affiché seulement si « As-tu déjà travaillé ? » = Oui) : domaine principal (liste), métier, années d'expérience (0-2 / 3-5 / 6-10 / 10+), expériences (employeur, poste, période, ville — plusieurs lignes), compétences (liste + « proposer une compétence »), niveau en bureautique (Débutant / Moyen / Bon).
4. **Informations matrimoniales** : situation (célibataire, marié(e), union libre, autre), si marié(e) ou union libre : nom et profession du conjoint, passeport du conjoint oui/non ; nombre d'enfants (0, 1, 2, 3+) ; personnes qui partiraient avec le candidat (oui/non, combien).

Règles d'ergonomie :
- une question ou un petit groupe de questions par écran,
- barre de progression et sommaire avec l'état de chaque étape (à faire, en cours, terminé, sauté),
- enregistrement automatique à chaque étape ; le candidat peut quitter et reprendre,
- si une réponse filtre passe de Oui à Non, les données de la section masquée sont conservées mais ignorées pour le classement ; elles réapparaissent si la réponse redevient Oui,
- récapitulatif final avec un bouton « Modifier » par section, case « je certifie l'exactitude », puis « Envoyer mon dossier ».

Le **test de langue** est demandé même sans diplôme ? → **Valeur par défaut : oui.** La question du test de langue est posée dans une étape « Langues » visible par tous, pour qu'un candidat sans diplôme puisse aussi déclarer un test. (À noter dans DECISIONS.md.)

### M4 — Justificatifs
- Pièces : pièce d'identité ou passeport, dernier diplôme, attestation de test de langue, certificats de travail, CV.
- Seules les pièces utiles sont demandées (pas de diplôme demandé à qui n'en a pas, etc.).
- Dépôt par photo (appareil du téléphone) ou fichier. Formats : JPG, PNG, PDF. Taille max : 10 Mo, images compressées automatiquement.
- États d'une pièce : **À déposer → Déposée (en attente) → Vérifiée** ou **Refusée (avec motif)**. Une pièce refusée peut être redéposée et repasse en attente.
- Les fichiers sont stockés de façon privée. Ils ne sont accessibles que par leur propriétaire et les administrateurs, via des liens temporaires.

### M5 — Moteur de classement
- Calcule le grade provisoire à chaque modification du dossier, d'une pièce ou d'un service.
- Produit une **explication** : liste des quatre éléments (diplôme, test de langue, coaching, niveau dans le domaine) avec l'état de chacun (fait / manquant / en attente de vérification).
- Les règles sont décrites en section 6 et leurs seuils sont paramétrables.
- Code isolé et testé de façon automatique (voir section 9).

### M6 — Services
- Pour chaque élément manquant, le service correspondant est suggéré automatiquement.
- Le candidat peut cliquer « Je suis intéressé ».
- États d'un service pour un candidat : **Suggéré → Intéressé → Accepté → En cours → Réalisé** (ou **Annulé**). Seul l'administrateur fait avancer au-delà de « Intéressé ».
- Un service « Réalisé » met à jour l'élément correspondant (ex. coaching fait) et relance le calcul du grade.

### M7 — Vivier et tableau de bord administrateur
- **Tableau de bord** : nombre de profils par grade (A, B, C, D, hors bassin, brouillons), dossiers à vérifier, grades provisoires à confirmer, candidats intéressés par un service, sélections de recruteurs reçues, derniers dossiers reçus.
- **Classement** : vue en colonnes A / B / C / D (cartes : initiales ou photo, nom, métier, ville, état provisoire/confirmé, ce qui manque), et vue liste.
- **Liste et filtres** : grade, état du grade, domaine, compétences (plusieurs), ville, langue, test de langue validé, passeport valide, années d'expérience, état des justificatifs, recherche par nom/téléphone. Filtres combinables.
- **Fiche candidat** : onglets Personnel / Académique / Professionnel / Matrimonial / Justificatifs / Services / Historique ; bloc « Pourquoi ce grade » ; notes internes ; actions.
- **Export Excel/CSV** de la liste filtrée (sans les pièces).

### M8 — Vérification et validation
- File des pièces à vérifier : aperçu du document à côté des informations déclarées.
- Actions : « Vérifiée » ou « Refusée » (motif obligatoire, choix rapide + texte libre).
- Évaluation du **niveau dans le domaine** par l'administrateur : Non évalué / Insuffisant / Suffisant.
- **Confirmer le grade** ou **corriger le grade** (raison obligatoire). Un grade corrigé reste figé jusqu'à ce que l'administrateur le libère ou qu'un changement du dossier le remette en provisoire (avec alerte).

### M9 — Recruteurs et sélections
- Création d'un accès recruteur : nom, entreprise, pays, e-mail, **périmètre** (grades visibles, domaines visibles), **date de fin obligatoire**. Aperçu : « Ce recruteur verra N profils. »
- Le recruteur reçoit ses identifiants par e-mail.
- Vue recruteur : liste des profils de son périmètre, filtres, fiche anonymisée (prénom + initiale du nom, grade, métier, domaine, expérience, compétences, langues et scores, badges « diplôme vérifié », « test de langue vérifié », « coaché par le cabinet »).
- Il ajoute des profils à **sa sélection**, peut laisser un commentaire par profil et un message, puis **envoie** la sélection.
- Côté admin : liste des sélections reçues, détail, et statut par candidat retenu (À contacter / Mis en relation / Retenu par l'employeur / Non retenu).
- Seuls les candidats ayant accepté « que mon profil soit présenté à des recruteurs » apparaissent aux recruteurs.

### M10 — Notifications e-mail
| Événement | Destinataire |
|---|---|
| Compte créé | Candidat |
| Dossier envoyé | Candidat + administrateurs |
| Pièce refusée (avec motif) | Candidat |
| Grade confirmé ou modifié | Candidat |
| Candidat intéressé par un service | Administrateurs |
| Accès recruteur créé | Recruteur |
| Sélection envoyée | Administrateurs |
| Accès recruteur bientôt expiré (J-3) | Administrateurs |

Les e-mails sont courts, en français, avec un lien vers la plateforme. Un service gratuit d'envoi d'e-mails est utilisé. Si aucun n'est configuré, les e-mails sont écrits dans un journal visible par l'admin (mode démo).

### M11 — Confidentialité et journal
- **Consentement** à l'inscription : (1) obligatoire — traitement des données pour le calcul du grade et l'accompagnement ; (2) facultatif — présentation du profil anonymisé à des recruteurs. Les deux sont datés et modifiables.
- **Journal des actions** : qui a vu, modifié, vérifié, exporté quoi, et quand. Les consultations des recruteurs y figurent. Le journal ne peut pas être modifié.
- **Suppression** : le candidat demande la suppression ; l'administrateur la confirme ; le dossier et les fichiers sont effacés, une trace anonyme de la demande est gardée.
- Le candidat voit dans son profil si son dossier a été consulté par un recruteur (nombre et date, sans nom d'entreprise).

---

## 5. Les workflows et leurs scénarios

### W1 — Inscription du candidat
1. Le candidat ouvre la page d'accueil, clique « Créer mon profil ».
2. Il saisit téléphone ou e-mail et un mot de passe.
3. Il lit et accepte l'usage de ses données (consentement 1 obligatoire, 2 facultatif).
4. Il arrive sur le sommaire de son dossier.

Scénarios :
- **Numéro déjà utilisé** → message « Ce numéro a déjà un compte. Connecte-toi ou contacte le cabinet. »
- **Refus du consentement obligatoire** → impossible de continuer, explication claire.
- **Refus du consentement recruteur** → le dossier est classé normalement mais n'est jamais visible par un recruteur.
- **Mot de passe oublié sans e-mail** → message pour contacter le cabinet (téléphone du cabinet affiché).

### W2 — Remplissage du dossier
1. Informations personnelles.
2. « As-tu un diplôme ? » → Oui : formulaire académique. Non : étape sautée, message « Pas de souci, ton expérience compte. »
3. Langues et test de langue.
4. « As-tu déjà travaillé ? » → Oui : formulaire professionnel. Non : étape sautée.
5. Informations matrimoniales.
6. Justificatifs.
7. Récapitulatif et envoi.

Scénarios :
- **Le candidat quitte au milieu** → tout ce qui est rempli est gardé ; au retour, bouton « Reprendre où je me suis arrêté ».
- **Connexion coupée pendant un dépôt** → message « Ton fichier sera envoyé dès que le réseau revient », nouvel essai possible sans tout ressaisir.
- **Diplôme Oui puis Non** → la section académique passe en « sautée », ses données ne comptent plus pour le grade.
- **Ni diplôme ni expérience** → le dossier peut être envoyé ; statut « Hors bassin — à orienter » (voir R-03).
- **Envoi avec pièces manquantes** → autorisé ; le grade reste provisoire et le récapitulatif liste les pièces manquantes.
- **Modification après envoi** → autorisée ; le grade est recalculé ; si le grade était confirmé, il repasse en provisoire et l'administrateur est alerté.

### W3 — Calcul et affichage du grade
1. Le moteur calcule le grade provisoire à chaque changement.
2. Le candidat voit son grade, la mention « provisoire » ou « confirmé », ce qui lui manque et les services proposés.
3. Il peut ouvrir « Pourquoi ce grade ? ».

Scénarios : voir les cas de test de la section 9.

### W4 — Intérêt pour un service
1. Le candidat clique « Je suis intéressé » sur un service.
2. L'administrateur est notifié et voit la demande dans le tableau de bord.
3. L'administrateur fait avancer l'état : Accepté → En cours → Réalisé.
4. À « Réalisé », l'élément manquant est considéré comme acquis et le grade est recalculé.

Scénarios :
- **Grade C, test de langue et mise à niveau réalisés** → passage en B, seul le coaching reste suggéré.
- **Grade B, coaching réalisé, pièces vérifiées** → grade A provisoire, à confirmer par l'administrateur.
- **Service annulé** → l'élément reste manquant, le service redevient « Suggéré ».

### W5 — Vérification des pièces
1. L'administrateur ouvre la file « À vérifier ».
2. Pour chaque pièce : Vérifiée, ou Refusée avec motif.
3. Le candidat est notifié en cas de refus et peut redéposer.

Scénarios :
- **Diplôme refusé** → l'élément diplôme passe en « en attente » ; le grade provisoire ne peut plus être A.
- **Attestation de langue avec score sous le minimum** → l'administrateur peut la marquer vérifiée, mais l'élément « test de langue » reste manquant.
- **Pièce redéposée** → retour dans la file, avec l'historique des refus.

### W6 — Confirmation ou correction du grade
1. Depuis la fiche ou la file « Grades à confirmer », l'administrateur confirme le grade provisoire ou le corrige.
2. Une correction exige une raison écrite.
3. Le candidat est notifié.

Scénarios :
- **Tentative de confirmer un A sans pièces vérifiées** → refusé par le système, avec la liste des pièces à vérifier.
- **Grade corrigé à la main puis dossier modifié** → le grade repasse en provisoire, alerte à l'administrateur.

### W7 — Recherche dans le vivier
1. L'administrateur combine des filtres (ex. domaine BTP, grade A ou B, passeport valide).
2. Il consulte les fiches, exporte la liste ou ouvre ce périmètre à un recruteur.

Scénarios :
- **Aucun résultat** → message clair et bouton « Effacer les filtres ».
- **Compétence écrite par un candidat et pas encore validée** → n'apparaît pas dans les filtres tant qu'elle n'est pas validée.

### W8 — Accès recruteur et sélection
1. L'administrateur crée l'accès (périmètre + date de fin).
2. Le recruteur reçoit ses identifiants, se connecte, filtre, ouvre des fiches.
3. Il ajoute des profils à sa sélection, commente, envoie.
4. L'administrateur reçoit la sélection et suit chaque candidat retenu.

Scénarios :
- **Accès expiré** → connexion refusée : « Votre accès a expiré, contactez le cabinet. »
- **Candidat sorti du périmètre** (grade baissé, consentement retiré, dossier supprimé) → disparaît de la liste du recruteur ; s'il était dans une sélection non envoyée, il en est retiré avec un message.
- **Recruteur qui tente d'ouvrir un profil hors périmètre par lien direct** → accès refusé et action inscrite au journal.
- **Sélection envoyée deux fois** → la seconde remplace la première, l'historique est gardé.

### W9 — Gestion des listes de référence
1. L'administrateur ajoute, renomme ou désactive un domaine, une compétence, un test, un service.
2. Il valide ou rejette les compétences proposées par les candidats.
3. Il ajuste les paramètres du classement ; tous les grades provisoires sont recalculés.

### W10 — Suppression d'un dossier
1. Le candidat clique « Demander la suppression de mon dossier » et confirme dans la page.
2. L'administrateur voit la demande et la valide.
3. Le dossier et les fichiers sont effacés ; le candidat reçoit un e-mail de confirmation s'il a un e-mail.

---

## 6. Règles métier

### Les quatre éléments évalués
| Élément | Acquis quand… |
|---|---|
| **Diplôme** | Le candidat a déclaré un diplôme. Pour un grade confirmé : la pièce « diplôme » est vérifiée. |
| **Test de langue** | Un test est déclaré avec un score ≥ au minimum du test (référentiel). Pour un grade confirmé : l'attestation est vérifiée. |
| **Coaching** | Le service de coaching est « Réalisé » (seul l'administrateur peut le marquer). |
| **Niveau dans le domaine** | L'administrateur l'a évalué « Suffisant ». En provisoire, avant évaluation : acquis si bureautique = « Bon » **et** expérience ≥ 3 ans (seuils paramétrables). |

### Les règles de grade (valeurs par défaut, modifiables)
- **R-01** Grade **A** : diplôme + test de langue + coaching + niveau acquis.
- **R-02** Grade **B** : diplôme + test de langue + niveau acquis, coaching manquant.
- **R-03** Pas de diplôme et pas d'expérience → statut **« Hors bassin — à orienter »** (pas de grade).
- **R-04** Grade **D** : pas de diplôme, avec expérience.
- **R-05** Grade **C** : diplôme, et au moins un manque autre que le seul coaching (test de langue et/ou niveau, avec ou sans coaching).
- **R-06** Un candidat a un seul grade à la fois.
- **R-07** Le grade calculé est **provisoire** ; seul l'administrateur le **confirme**.
- **R-08** Aucun grade **A** n'est confirmé sans pièce d'identité, diplôme et attestation de langue vérifiés.
- **R-09** Toute correction manuelle d'un grade exige une raison, inscrite au journal.
- **R-10** Un dossier en brouillon (non envoyé) n'apparaît pas dans le classement, seulement dans le compteur « brouillons ».
- **R-11** Un service « Réalisé » relance le calcul immédiatement.
- **R-12** Chaque élément manquant produit une suggestion du service correspondant.
- **R-13** Pour le grade D, les services suggérés par défaut sont le test de langue et le coaching ; la liste est paramétrable.
- **R-14** Un recruteur ne voit que les profils envoyés, confirmés, dans son périmètre, et dont le consentement recruteur est actif.
- **R-15** Un recruteur ne voit jamais les coordonnées ni les pièces.
- **R-16** Un accès recruteur a toujours une date de fin.
- **R-17** Un téléphone ou un e-mail = un seul compte.

> Ces règles ont été proposées par Nextiaa et restent à valider par M. Michel.
> Elles doivent toutes être paramétrables depuis l'espace admin (écran « Paramètres du classement ») sans modifier le code.

---

## 7. Les données (vue fonctionnelle)

Entités à prévoir, sans imposer de structure technique :

- **Utilisateur** : rôle, identifiants, état (actif/désactivé), dates.
- **Candidat / Dossier** : statut (brouillon, envoyé, hors bassin, supprimé), réponses des quatre groupes, réponses filtres, consentements datés.
- **Expérience professionnelle** (plusieurs par dossier).
- **Compétence du candidat** (lien vers la liste de référence).
- **Pièce justificative** : type, fichier, état, motif de refus, historique.
- **Évaluation** : niveau dans le domaine évalué par l'admin.
- **Grade** : grade calculé, grade affiché, état (provisoire/confirmé/corrigé), explication, raison de correction, auteur, date. Historique complet.
- **Service suggéré** : candidat, service, état, dates.
- **Recruteur / Accès** : entreprise, pays, périmètre, date de fin.
- **Sélection** : recruteur, candidats retenus, commentaires, message, statut par candidat.
- **Listes de référence** : domaines, compétences, tests, diplômes, services, paramètres de classement.
- **Journal** : acteur, rôle, action, cible, date.
- **E-mail envoyé** (journal des notifications).

---

## 8. Sécurité (non négociable)

1. Les droits de chaque rôle sont vérifiés **côté serveur** sur chaque lecture et chaque écriture.
2. Les fichiers des candidats sont **privés** ; accès uniquement par lien temporaire, jamais par une adresse publique.
3. Le recruteur ne reçoit jamais dans les réponses du serveur les champs : téléphone, e-mail, adresse, date de naissance complète, nom de famille complet, conjoint, enfants, fichiers.
4. Mots de passe stockés de façon sécurisée (jamais en clair). Limitation des tentatives de connexion.
5. Aucun secret (clé, mot de passe) dans le dépôt Git : fichier d'exemple des variables d'environnement uniquement.
6. Toutes les pages en HTTPS.
7. Sauvegarde de la base au moins une fois par semaine (procédure décrite dans le README).

---

## 9. Tests indispensables

Le moteur de classement doit être couvert par des tests automatiques. Au minimum :

| # | Situation | Résultat attendu |
|---|---|---|
| T1 | Diplôme, test ≥ minimum, coaching réalisé, niveau suffisant | Grade A provisoire |
| T2 | Même dossier, coaching non réalisé | Grade B |
| T3 | Diplôme, pas de test, pas de coaching, niveau insuffisant | Grade C, 3 services suggérés |
| T4 | Diplôme, test sous le minimum, coaching fait, niveau suffisant | Grade C, service « test de langue » suggéré |
| T5 | Pas de diplôme, 12 ans d'expérience | Grade D, étape académique sautée |
| T6 | Pas de diplôme, pas d'expérience | Hors bassin — à orienter |
| T7 | Grade C, test et mise à niveau marqués réalisés | Grade B, seul le coaching suggéré |
| T8 | Candidat qui déclare un coaching, rien marqué par l'admin | Coaching manquant |
| T9 | Confirmation d'un A avec diplôme non vérifié | Refusée par le système |
| T10 | Recruteur « Grade A, BTP » | Aucun B, aucun autre domaine, aucun téléphone dans les réponses |
| T11 | Accès recruteur expiré | Connexion refusée |
| T12 | Brouillon repris 3 jours plus tard | Reprise à la dernière étape remplie |
| T13 | Deuxième inscription avec le même numéro | Refusée |
| T14 | Grade confirmé puis dossier modifié | Repasse en provisoire, alerte admin |
| T15 | Changement d'un seuil dans les paramètres | Tous les grades provisoires recalculés |

Plus un test de bout en bout par espace : inscription → envoi du dossier ; vérification → confirmation ; création d'accès recruteur → sélection envoyée.

---

## 10. Ordre d'implémentation (8 semaines)

Chaque lot se termine par : tests verts, démonstration possible, commit et fusion dans `main`, résumé écrit.

**Lot 1 — Fondations (semaine 1)**
1. Choix de la technologie et de l'hébergement, justifié dans le README.
2. Création du dépôt Git (section 11) et déploiement automatique d'un environnement de test.
3. Comptes et trois rôles, droits vérifiés côté serveur.
4. Compte administrateur principal et connexion admin.
5. Listes de référence (M2) avec données de départ.
6. Charte graphique de base : couleurs, police, composants (section 12).

**Lot 2 — Espace candidat (semaines 2 et 3)**
7. Accueil, inscription, consentements.
8. Sommaire du dossier et progression.
9. Les quatre groupes de formulaires avec les questions filtres.
10. Enregistrement automatique et reprise.
11. Justificatifs (dépôt, compression, états).
12. Récapitulatif et envoi.

**Lot 3 — Moteur de classement (semaine 4)**
13. Calcul du grade (section 6) et explication.
14. Tests T1 à T9, T14, T15.
15. Suggestion des services, bouton « Je suis intéressé ».
16. Tableau de bord du candidat et écran « Pourquoi ce grade ? ».

**Lot 4 — Espace administrateur (semaines 5 et 6)**
17. Tableau de bord.
18. Classement en colonnes et vue liste avec filtres.
19. Fiche candidat complète, notes internes.
20. File de vérification des pièces, évaluation du niveau.
21. Confirmation et correction des grades.
22. Suivi des services.
23. Export Excel/CSV.
24. Paramètres du classement.

**Lot 5 — Espace recruteur (semaine 7)**
25. Création des accès recruteurs, périmètre, date de fin.
26. Liste et fiche anonymisées, filtres.
27. Sélection et envoi ; réception côté admin.
28. Tests T10, T11.

**Lot 6 — Finitions et mise en ligne (semaine 8)**
29. Notifications e-mail (M10).
30. Journal des actions et demandes de suppression (M11).
31. Installation PWA, optimisation pour réseau lent.
32. Données de démonstration (comptes de test et ~20 candidats fictifs clairement marqués « démo »), effaçables d'un clic.
33. Mise en production sur le domaine Hostinger, sauvegardes, guide d'utilisation administrateur (`docs/guide-admin.md`).

---

## 11. Dépôt Git — à créer par Claude Code

- Hébergé sur **GitHub**, dépôt **privé** nommé `bassin-de-talents`.
- Branche `main` toujours déployable. Une branche par lot : `lot-1-fondations`, `lot-2-candidat`, `lot-3-classement`, `lot-4-admin`, `lot-5-recruteur`, `lot-6-finitions`, fusionnées dans `main` à la fin de chaque lot.
- Messages de commit courts et clairs, en français (ex. « Ajoute le formulaire académique avec la question filtre »).
- Fichiers à la racine :
  - `README.md` : présentation, technologie choisie et pourquoi, installation locale, déploiement, sauvegarde, comptes de démo.
  - `SPECIFICATION.md` : ce document.
  - `DECISIONS.md` : chaque choix pris par défaut faute d'information, avec la date.
  - `CHANGELOG.md` : ce qui a été livré à chaque lot.
  - Fichier d'exemple des variables d'environnement (sans valeurs secrètes).
  - `maquettes/` : captures des écrans de référence.
  - `docs/` : guide administrateur.
- Un fichier qui ignore les secrets, les dépendances installées et les fichiers déposés par les utilisateurs.
- Un déploiement automatique depuis `main` si la technologie choisie le permet gratuitement.

---

## 12. Charte graphique

| Rôle | Couleur |
|---|---|
| Bleu nuit (menus, titres) | `#0F2A4A` |
| Vert émeraude (boutons d'action) | `#006D33` |
| Vert menthe (validé, progression) | `#7CF5A5` |
| Fond clair | `#F8F9FF` |
| Bleu brume (champs, encadrés) | `#EEF2FB` |
| Encre (textes) | `#101B2B` |

| Grade | Couleur | Libellé |
|---|---|---|
| A | `#006D33` vert | Prêt à l'emploi |
| B | `#0F2A4A` bleu nuit | Coaching manquant |
| C | `#D97706` orange | Mise à niveau requise |
| D | `#912CEA` violet | Expérience sans diplôme |
| Hors bassin | gris `#56637A` | À orienter |

- Police : **Poppins** (titres en gras), texte de 16 px minimum sur téléphone.
- Coins arrondis (12 px), cartes blanches, ombres légères, boutons larges (52 px de haut sur mobile).
- La lettre du grade accompagne toujours la couleur.
- Badges d'état : Vérifié (menthe), En attente (bleu brume), Refusé (rouge clair), Provisoire, Confirmé.
- Les maquettes du dossier `maquettes/` servent de modèle d'apparence. **Attention :** elles contiennent des textes inventés (chiffres de placements, « plateforme certifiée », partenaires, témoignages). **Ne pas les reprendre.** Utiliser uniquement les textes de ce document.
- Nom de travail : « Bassin de Talents ». Le nom et le logo définitifs seront fournis plus tard ; prévoir de les changer à un seul endroit.

### Correspondance maquettes → écrans
| Fichier | Écran |
|---|---|
| m01-accueil | Accueil candidat |
| m02-compte | Création de compte |
| m03-code | Vérification du numéro (hors MVP : remplacée par la vérification par e-mail ou supprimée, les SMS étant payants) |
| m04-consentement | Accord sur les données |
| m05-sommaire | Sommaire du dossier |
| m06-personnel | Informations personnelles |
| m07-diplome-oui / m08-diplome-non | Question filtre diplôme |
| m09-etudes | Informations académiques |
| m10-travail | Question filtre expérience |
| m11-experience | Informations professionnelles |
| m12-famille | Informations matrimoniales |
| m13-justificatifs | Justificatifs |
| m14-recap | Récapitulatif |
| m15-accueil-candidat | Tableau de bord candidat |
| m16-pourquoi | Pourquoi ce grade ? |
| w01-connexion | Connexion admin |
| w02-dashboard | Tableau de bord admin |
| w03-classement | Classement par grade |
| w04-liste | Liste des candidats et filtres |

Pas de maquette pour l'espace recruteur ni pour la fiche candidat, la vérification et les paramètres : les concevoir dans le même style.

---

## 13. Points ouverts (à appliquer par défaut, à confirmer par M. Michel)

1. Critères exacts des grades et scores minimum des tests de langue.
2. Services proposés au grade D.
3. Droits du recruteur (accès limité retenu par défaut).
4. Liste définitive des domaines et compétences.
5. Nom et logo de la plateforme.
6. Nombre de comptes administrateurs.

Chaque point est géré par une valeur par défaut modifiable et consigné dans `DECISIONS.md`.

---

## 14. Définition de « terminé » pour le MVP

- Un candidat peut, depuis son téléphone, créer son compte, remplir son dossier, déposer ses pièces et voir son grade avec les services proposés.
- L'administrateur peut, en moins de cinq minutes, répondre à une demande du type « tous les profils A et B en BTP avec passeport valide » et ouvrir ce périmètre à un recruteur.
- Le recruteur peut faire et envoyer sa sélection sans jamais voir de coordonnées.
- Tous les tests de la section 9 passent.
- L'application est en ligne sur le domaine du client, en HTTPS, avec un guide d'utilisation administrateur.
