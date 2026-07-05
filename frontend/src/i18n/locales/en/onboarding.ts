/**
 * `onboarding` namespace (English — source of truth).
 *
 * Copy for the first-login onboarding wizard: the optional profile step, the
 * welcome/path-choice step, the CSV import flow, the manual-entry step, and the
 * final summary. Generic action labels come from the `common` namespace.
 */

const onboarding = {
  profile: {
    title: "A bit about you",
    description:
      "Optional — set a goal and height to unlock progress projections and BMI. You can change these anytime in Settings.",
    heightLabel: "Height (cm)",
    heightPlaceholder: "e.g. 178",
    goalLabel: "Goal weight ({{unit}})",
    goalPlaceholderKg: "e.g. 75",
    goalPlaceholderLb: "e.g. 165",
    skip: "Skip",
  },
  welcome: {
    title: "Welcome to Weight Tracker",
    description:
      "Your dashboard is empty for now. Let's get your measurements in — you can import a CSV file or add entries manually.",
    csvCardTitle: "Import a CSV file",
    csvCardDescription:
      "Upload an existing export from a scale app or spreadsheet.",
    manualCardTitle: "Add measurements manually",
    manualCardDescription: "Enter your weight entries one by one.",
    skip: "Skip for now — I'll add data later",
  },
  csvStep: {
    heading: "Import CSV",
  },
  manual: {
    title: "Add measurements",
    description:
      'Add as many entries as you like. Click "Done" when you\'re ready.',
    added_one: "{{count}} measurement added",
    added_other: "{{count}} measurements added",
  },
  done: {
    title: "You're all set!",
    csvSummary_one: "{{count}} measurement imported successfully.",
    csvSummary_other: "{{count}} measurements imported successfully.",
    manualSummary_one: "{{count}} measurement added.",
    manualSummary_other: "{{count}} measurements added.",
    manualEmpty: "Your dashboard is ready whenever you are.",
    skippedSummary:
      "Head to the Data page to add your measurements whenever you're ready.",
    goToDashboard: "Go to dashboard",
  },
  csv: {
    analysing: "Analysing file…",
    dropHint: "Drop your CSV here, or click to browse",
    columnsHint: "Two columns required: <0>date</0> and <1>weight</1>",
    acceptedFormats: "Accepted formats",
    formatDelimiter: "Delimiter: comma, semicolon, or tab — auto-detected",
    formatDecimal: "Decimal separator: period <0>83.5</0> or comma <1>83,5</1>",
    formatDate: "Date: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY — auto-detected",
    chipDetectedFormat: "Detected format",
    chipExample: "Example",
    chipTotalRows: "Total rows",
    chipSkipped: "Skipped (invalid)",
    tableDate: "Date",
    tableWeight: "Weight (kg)",
    tableFooter_one: "{{count}} row — all will be imported",
    tableFooter_other: "{{count}} rows — all will be imported",
    chooseAnother: "Choose another file",
    importRows_one: "Import {{count}} row",
    importRows_other: "Import {{count}} rows",
    saving: "Saving your data…",
    importComplete: "Import complete",
    resultInserted_one: "{{count}} measurement added",
    resultInserted_other: "{{count}} measurements added",
    resultDuplicates_one: ", {{count}} duplicate skipped",
    resultDuplicates_other: ", {{count}} duplicates skipped",
    resultInvalid_one: ", {{count}} invalid row skipped",
    resultInvalid_other: ", {{count}} invalid rows skipped",
    errorTitle: "Could not parse the file",
    errorNotCsv: "Please upload a .csv file.",
    errorParseFailed: "Failed to parse CSV",
    errorImportFailed: "Import failed",
    tryAgain: "Try again",
    goBack: "Go back",
  },
};

export type OnboardingResource = typeof onboarding;

export default onboarding;
