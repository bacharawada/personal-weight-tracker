/**
 * `medication` namespace (English — source of truth).
 *
 * Copy for the medication (GLP-1) dose journal: the Data-page section
 * (list + add form + delete modal), the weight-chart marker toggle and
 * tooltip, and the Analysis-page dose-change impact table.
 */

const medication = {
  section: {
    title: "Medication",
    subtitle_one: "{{count}} dose logged",
    subtitle_other: "{{count}} doses logged",
    empty: "No doses logged yet.",
  },
  table: {
    date: "Date",
    medication: "Medication",
    dose: "Dose",
    note: "Note",
    actions: "Actions",
  },
  form: {
    heading: "Log a dose",
    dateLabel: "Date",
    medicationLabel: "Medication",
    medicationPlaceholder: "e.g. semaglutide",
    doseLabel: "Dose (mg)",
    dosePlaceholder: "e.g. 0.25",
    noteLabel: "Note (optional)",
    notePlaceholder: "Any context…",
    submit: "Add dose",
    submitAdding: "Adding…",
    errorDateRequired: "Please pick a date.",
    errorMedicationRequired: "Please enter a medication.",
    errorDosePositive: "Dose must be greater than 0.",
    errorUnknown: "Unknown error",
    added: "Logged {{medication}} on {{date}}",
  },
  dose: {
    mg: "{{value}} mg",
    none: "—",
  },
  csvModal: {
    title: "Import doses (CSV)",
    description:
      "Upload a CSV file with <code>date</code> and <code>medication</code> columns. <code>dose_mg</code> and <code>note</code> are optional. Rows already in your journal are skipped.",
    columnsHint:
      "Columns <0>date</0>, <1>medication</1>, and optionally <2>dose_mg</2>, <3>note</3>",
  },
  deleteModal: {
    title: "Delete dose",
    description:
      "Delete the <strong>{{medication}}</strong> dose from <strong>{{date}}</strong>? This cannot be undone.",
    confirmLabel: "Delete",
  },
  chart: {
    toggle: "Medication doses",
    tooltipDose: "{{medication}} — {{dose}} mg",
    tooltipNoDose: "{{medication}}",
  },
  impact: {
    title: "Dose-change impact",
    subtitle:
      "Weight trend {{window}} days before vs. after each dose change",
    empty: "Log medication doses to see how each change affected your trend.",
    colChange: "Dose change",
    colBefore: "Before",
    colAfter: "After",
    colDelta: "Change",
    firstDose: "Started {{medication}}",
    firstDoseWithMg: "Started {{medication}} at {{dose}} mg",
    doseChange: "{{medication}}: {{from}} → {{to}} mg",
    perWeek: "{{value}} {{unit}}/wk",
    insufficient: "Not enough data",
    insufficientDetail:
      "Need 3+ measurements within {{window}} days on each side",
  },
};

export type MedicationResource = typeof medication;

export default medication;
