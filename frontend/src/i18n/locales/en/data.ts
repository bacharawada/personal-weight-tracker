/**
 * `data` namespace (English — source of truth).
 *
 * Copy for the Data page: page title/subtitle, table headers, action
 * cards/FAB labels, export controls, the four modals (add measurement,
 * CSV import, delete measurement, delete all), and the AddMeasurement form.
 */

const data = {
  page: {
    title: "Data",
    subtitle_one: "{{count}} measurement recorded",
    subtitle_other: "{{count}} measurements recorded",
  },
  table: {
    date: "Date",
    weight: "Weight ({{unit}})",
    note: "Note",
    actions: "Actions",
    empty: "No measurements yet.",
    addFirst: "Add your first one",
  },
  toolbar: {
    deleteAll: "Delete all",
    exportCsv: "Export CSV",
  },
  actionCard: {
    addTitle: "Add entry",
    addDescription: "Log a new measurement",
    importTitle: "Import CSV",
    importDescription: "Upload from a file",
  },
  fab: {
    openActions: "Open actions",
    closeActions: "Close actions",
    importCsv: "Import CSV",
    addEntry: "Add entry",
  },
  row: {
    editWeight: "Edit",
    notePlaceholder: "Add a note…",
  },
  addModal: {
    title: "Add measurement",
    description: "Enter a date and your weight in kilograms.",
  },
  csvModal: {
    title: "Import CSV",
    description:
      "Upload a CSV file with <code>date</code> and <code>weight</code> columns. Delimiter and date format are detected automatically.",
  },
  deleteModal: {
    title: "Delete measurement",
    description:
      "Are you sure you want to delete the measurement for <strong>{{date}}</strong> ({{weight}} kg)? This cannot be undone.",
    confirmLabel: "Delete",
  },
  deleteAllModal: {
    title: "Delete all measurements",
    description_one:
      "This will permanently delete all <strong>{{count}} measurement</strong>. This cannot be undone.",
    description_other:
      "This will permanently delete all <strong>{{count}} measurements</strong>. This cannot be undone.",
    confirmLabel: "Delete all",
  },
  form: {
    heading: "Add Measurement",
    dateLabel: "Date",
    weightLabel: "Weight ({{unit}})",
    weightPlaceholderLb: "e.g. 165",
    weightPlaceholderKg: "e.g. 75.5",
    noteLabel: "Note (optional)",
    notePlaceholder: "e.g. after vacation",
    submitAdding: "Adding…",
    submitAdd: "Add",
    errorFillBoth: "Please fill in both date and weight.",
    errorRange: "Weight must be between {{min}} and {{max}} {{unit}}.",
    errorUnknown: "Unknown error",
    added: "Added: {{date}} — {{weight}} {{unit}}",
  },
};

export type DataResource = typeof data;

export default data;
