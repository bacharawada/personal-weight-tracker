/**
 * `onboarding` namespace (French).
 *
 * Mirrors the English `onboarding` resource key-for-key.
 */

import type { OnboardingResource } from "../en/onboarding";

const onboarding: OnboardingResource = {
  profile: {
    title: "Un peu à propos de vous",
    description:
      "Facultatif — définissez un objectif et une taille pour débloquer les projections de progression et l'IMC. Vous pouvez les modifier à tout moment dans les Paramètres.",
    heightLabel: "Taille (cm)",
    heightPlaceholder: "ex. 178",
    goalLabel: "Poids cible ({{unit}})",
    goalPlaceholderKg: "ex. 75",
    goalPlaceholderLb: "ex. 165",
    skip: "Passer",
  },
  welcome: {
    title: "Bienvenue sur Weight Tracker",
    description:
      "Votre tableau de bord est vide pour l'instant. Ajoutons vos mesures — vous pouvez importer un fichier CSV ou saisir des entrées manuellement.",
    csvCardTitle: "Importer un fichier CSV",
    csvCardDescription:
      "Téléversez un export existant depuis une application de balance ou un tableur.",
    manualCardTitle: "Ajouter des mesures manuellement",
    manualCardDescription: "Saisissez vos entrées de poids une par une.",
    skip: "Passer pour l'instant — j'ajouterai des données plus tard",
  },
  csvStep: {
    heading: "Importer un CSV",
  },
  manual: {
    title: "Ajouter des mesures",
    description:
      'Ajoutez autant d\'entrées que vous le souhaitez. Cliquez sur « Terminé » quand vous êtes prêt.',
    added_one: "{{count}} mesure ajoutée",
    added_other: "{{count}} mesures ajoutées",
  },
  done: {
    title: "Tout est prêt !",
    csvSummary_one: "{{count}} mesure importée avec succès.",
    csvSummary_other: "{{count}} mesures importées avec succès.",
    manualSummary_one: "{{count}} mesure ajoutée.",
    manualSummary_other: "{{count}} mesures ajoutées.",
    manualEmpty: "Votre tableau de bord est prêt quand vous l'êtes.",
    skippedSummary:
      "Rendez-vous sur la page Données pour ajouter vos mesures quand vous le souhaitez.",
    goToDashboard: "Aller au tableau de bord",
  },
  csv: {
    analysing: "Analyse du fichier…",
    dropHint: "Déposez votre CSV ici, ou cliquez pour parcourir",
    columnsHint: "Deux colonnes requises : <0>date</0> et <1>weight</1>",
    acceptedFormats: "Formats acceptés",
    formatDelimiter:
      "Séparateur : virgule, point-virgule ou tabulation — détecté automatiquement",
    formatDecimal:
      "Séparateur décimal : point <0>83.5</0> ou virgule <1>83,5</1>",
    formatDate:
      "Date : AAAA-MM-JJ, JJ/MM/AAAA, MM/JJ/AAAA — détecté automatiquement",
    chipDetectedFormat: "Format détecté",
    chipExample: "Exemple",
    chipTotalRows: "Lignes totales",
    chipSkipped: "Ignorées (invalides)",
    tableDate: "Date",
    tableWeight: "Poids (kg)",
    tableFooter_one: "{{count}} ligne — toutes seront importées",
    tableFooter_other: "{{count}} lignes — toutes seront importées",
    chooseAnother: "Choisir un autre fichier",
    importRows_one: "Importer {{count}} ligne",
    importRows_other: "Importer {{count}} lignes",
    saving: "Enregistrement de vos données…",
    importComplete: "Importation terminée",
    resultInserted_one: "{{count}} mesure ajoutée",
    resultInserted_other: "{{count}} mesures ajoutées",
    resultDuplicates_one: ", {{count}} doublon ignoré",
    resultDuplicates_other: ", {{count}} doublons ignorés",
    resultInvalid_one: ", {{count}} ligne invalide ignorée",
    resultInvalid_other: ", {{count}} lignes invalides ignorées",
    errorTitle: "Impossible d'analyser le fichier",
    errorNotCsv: "Veuillez téléverser un fichier .csv.",
    errorParseFailed: "Échec de l'analyse du CSV",
    errorImportFailed: "Échec de l'importation",
    tryAgain: "Réessayer",
    goBack: "Retour",
  },
};

export default onboarding;
