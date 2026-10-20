# Français et anglais

Pulse embarque ses textes français et anglais dans l’application. La traduction fonctionne hors ligne et ne transmet aucune donnée à un service de traduction.

La première langue prise en charge dans les préférences Android est utilisée (`fr-CA` et `fr-FR` donnent le français). L’anglais sert de repli. Sur les versions Android qui proposent une langue par application, Pulse déclare le français et l’anglais dans ce sélecteur système. La langue est relue au retour au premier plan, sans recréer la navigation ni effacer les formulaires.

## Organisation

- `src/i18n/locales/en.json` et `fr.json` : catalogues embarqués, avec les mêmes clés et variables d’interpolation.
- `src/i18n/index.ts` : instance i18next indépendante du code natif, clés typées et résolution de langue.
- `src/i18n/native.ts` : `expo-localization`, initialisé avant le routeur et les tâches d’arrière-plan.
- `src/i18n/react.ts` : abonnement des composants à la langue courante.
- `src/lib/format.ts` : nombres, dates, heures, unités visibles et descriptions accessibles. Les heures françaises utilisent le format 24 h.

Les modèles d’écran sont mis en cache par langue. Un changement invalide les résultats et empêche une ancienne requête de remettre du texte dans la mauvaise langue. Les catalogues partagés utilisent des accesseurs ou des fonctions, pour ne pas figer la langue au chargement du module. Les libellés dessinés dans des worklets Skia sont calculés sur le thread JavaScript, puis transmis comme chaînes.

Les identifiants, types Health Connect, clés de stockage, unités de calcul, routes et formats d’export restent stables. Les noms et notes saisis par la personne, les noms fournis par les appareils et les conversations existantes sont conservés. Les comportements standard sont traduits à l’affichage ; un libellé personnalisé reste intact. Le moteur conserve ses calculs : les textes français des bilans et des suggestions lui sont fournis explicitement par la couche de présentation.

## Ajouter ou modifier un texte

1. Ajouter une clé descriptive dans les deux catalogues. Traduire une phrase complète et utiliser des variables pour ses valeurs.
2. Utiliser les suffixes `_one` et `_other` et passer `count` quand la quantité change la grammaire.
3. Appeler `tr()` au moment de l’affichage. Dans un composant, utiliser `useLanguage()` ; inclure la langue dans les dépendances des calculs mémorisés qui produisent du texte.
4. Utiliser les fonctions de formatage pour les nombres et dates. Ne pas traduire une valeur technique persistée.
5. Lancer `pnpm typecheck`, `pnpm lint` et `pnpm test`. Les tests i18n contrôlent les catalogues, les formats, le cache, les valeurs de formulaire et la conservation des identifiants et résultats numériques.

## Build et contrôle sur téléphone

L’ajout d’`expo-localization` et la déclaration des langues demandent un nouveau build natif Android. Une simple mise à jour JavaScript d’un ancien APK ne suffit pas. Les raccourcis du lanceur sont générés en anglais et en français par `plugins/withAppShortcuts.js` ; aucun fichier `android/` n’est modifié à la main.

Le bundle Android et la génération des ressources de raccourcis se vérifient localement. Ils ne prouvent pas le rendu sur téléphone. Conformément à `AGENTS.md`, le propriétaire vérifie sur son appareil : français/anglais, changement de langue avec une saisie en cours, dates et virgules décimales, textes longs des graphiques et aides, TalkBack, raccourcis et rappels planifiés. Vérifier aussi qu’un comportement renommé conserve son nom et que les données existantes sont inchangées.

### Libellés longs et petits écrans

Les boutons partagés suivent le rôle typographique du contrat (13/16, espacement de 0,06 em), centrent leur texte et gardent une hauteur minimale de 44 px qui peut grandir avec le contenu. Dans « Source des données », synchronisation et réimportation passent sur deux rangées lorsque leur largeur cumulée ne tient plus. Les choix de source affichent des libellés courts avec leur nom complet pour TalkBack et leur explication sous le contrôle. Les segments partagés sont centrés et peuvent grandir ; le profil, l’apparence et l’objectif de sommeil les réutilisent.

La capture du premier APK a révélé les coupures de « Synchroniser » et les choix Fitbit trop serrés. Contrôler la correction sur téléphone à 320, 360 et 414 dp, avec texte standard puis agrandi, ainsi que les trois autres usages des segments. L’APK initialement envoyé ne contient pas encore cette correction.

Les dépôts de référence `~/personal/halo` et `~/personal/pulse/docs/research/bevel/` n’étaient pas disponibles pendant ce travail. La vérification s’appuie sur les sources de ce dépôt et sa suite de tests ; aucune comparaison avec ces copies externes n’est revendiquée.
