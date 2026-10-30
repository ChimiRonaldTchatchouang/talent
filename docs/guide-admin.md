# Guide d'utilisation administrateur

Ce guide sera complété au lot 6.

## Se connecter
Ouvrez `/connexion` et saisissez votre e-mail et votre mot de passe. Après 5 essais incorrects, le compte est
bloqué 15 minutes.

## Tableau de bord
La page d'accueil de l'espace administrateur. Elle montre le nombre de profils par grade et les tâches à faire :
pièces à vérifier, grades à confirmer, grades à revoir et demandes de services. Cliquez sur un compteur pour
ouvrir la liste correspondante.

## Vivier
- **Colonnes** : un profil par carte, rangé par grade. **Liste** : un tableau plus détaillé.
- **Filtres** : combinez-les librement. Exemple : grade A et B, domaine BTP, « Passeport valide ».
- **Exporter (Excel)** : télécharge la liste affichée (filtres compris), sans les documents.
- Cliquez sur un candidat pour ouvrir sa fiche.

## Fiche candidat
- **Actions sur le grade** :
  - **Confirmer** : un grade A n'est confirmé que si la pièce d'identité, le diplôme et l'attestation de langue sont vérifiés ;
  - **Corriger** : choisissez le grade et écrivez la raison ;
  - **Libérer** : le grade redevient le grade calculé, provisoire.
- **Niveau dans le domaine** : non évalué, insuffisant ou suffisant. Le grade est recalculé aussitôt.
- **Services** : faites avancer chaque service (accepté, en cours, réalisé). Un service réalisé met le grade à jour.
- **Notes internes** : visibles uniquement par le cabinet.
- **Réinitialiser le mot de passe** (onglet Personnel) : pour un candidat sans e-mail. Le mot de passe provisoire
  n'est affiché qu'une fois.

## Pièces à vérifier
Chaque document s'affiche à côté de ce que le candidat a déclaré. Cliquez sur **Vérifiée**, ou sur **Refuser** :
choisissez un motif ou écrivez-le. Le candidat reçoit le motif par e-mail et peut déposer une nouvelle pièce, qui
revient dans la file.

## Services
La liste des candidats intéressés par un service, et des services en cours. Un clic fait passer à l'étape suivante.

## Listes de référence
Menu **Listes de référence** : domaines, compétences, tests de langue, services et diplômes.
- **Ajouter** : remplissez le cadre en haut de l'onglet.
- **Modifier** : bouton « Modifier » sur la ligne, puis « Enregistrer ».
- **Désactiver** : l'élément n'est plus proposé aux candidats, mais reste visible dans les dossiers qui l'utilisent déjà.
- **Compétences proposées par les candidats** : elles apparaissent en haut de l'onglet Compétences. Validez-les ou rejetez-les.

## Paramètres du classement
Menu **Paramètres** : seuils utilisés pour calculer les grades provisoires. Chaque enregistrement crée une
nouvelle version et est inscrit au journal.

## Administrateurs
Seul l'administrateur principal peut créer, désactiver ou réactiver un compte administrateur.

## Réglages et e-mails
Menu **Réglages et e-mails** :
- **Coordonnées du cabinet** : le téléphone saisi ici est affiché aux candidats sans e-mail qui ont oublié leur mot de passe.
- **E-mails envoyés** : les 100 derniers e-mails. Cliquez sur un e-mail pour lire son contenu.
  Tant que le service d'envoi (Resend) n'est pas configuré, les e-mails ne partent pas : ils sont seulement listés ici (« mode démo »).

