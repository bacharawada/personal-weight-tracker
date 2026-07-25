/**
 * `medication` namespace (French).
 *
 * Mirrors the English `medication` resource key-for-key.
 */

import type { MedicationResource } from "../en/medication";

const medication: MedicationResource = {
  section: {
    title: "Médication",
    subtitle_one: "{{count}} dose enregistrée",
    subtitle_other: "{{count}} doses enregistrées",
    empty: "Aucune dose enregistrée pour l'instant.",
  },
  table: {
    date: "Date",
    medication: "Molécule",
    dose: "Dose",
    note: "Note",
    actions: "Actions",
  },
  form: {
    heading: "Enregistrer une dose",
    dateLabel: "Date",
    medicationLabel: "Molécule",
    medicationPlaceholder: "ex. semaglutide",
    doseLabel: "Dose (mg)",
    dosePlaceholder: "ex. 0,25",
    noteLabel: "Note (facultatif)",
    notePlaceholder: "Contexte éventuel…",
    submit: "Ajouter la dose",
    submitAdding: "Ajout…",
    errorDateRequired: "Veuillez choisir une date.",
    errorMedicationRequired: "Veuillez saisir une molécule.",
    errorDosePositive: "La dose doit être supérieure à 0.",
    errorUnknown: "Erreur inconnue",
    added: "{{medication}} enregistrée le {{date}}",
  },
  dose: {
    mg: "{{value}} mg",
    none: "—",
  },
  csvModal: {
    title: "Importer des doses (CSV)",
    description:
      "Chargez un fichier CSV avec les colonnes <code>date</code> et <code>medication</code>. <code>dose_mg</code> et <code>note</code> sont facultatives. Les lignes déjà présentes dans le journal sont ignorées.",
    columnsHint:
      "Colonnes <0>date</0>, <1>medication</1>, et éventuellement <2>dose_mg</2>, <3>note</3>",
  },
  deleteModal: {
    title: "Supprimer la dose",
    description:
      "Supprimer la dose de <strong>{{medication}}</strong> du <strong>{{date}}</strong> ? Cette action est irréversible.",
    confirmLabel: "Supprimer",
  },
  chart: {
    toggle: "Doses de médication",
    tooltipDose: "{{medication}} — {{dose}} mg",
    tooltipNoDose: "{{medication}}",
  },
  impact: {
    title: "Impact des changements de dose",
    subtitle:
      "Tendance du poids {{window}} jours avant vs. après chaque changement de dose",
    empty:
      "Enregistrez des doses pour voir l'effet de chaque changement sur votre tendance.",
    colChange: "Changement de dose",
    colBefore: "Avant",
    colAfter: "Après",
    colDelta: "Écart",
    firstDose: "Début de {{medication}}",
    firstDoseWithMg: "Début de {{medication}} à {{dose}} mg",
    doseChange: "{{medication}} : {{from}} → {{to}} mg",
    perWeek: "{{value}} {{unit}}/sem",
    insufficient: "Données insuffisantes",
    insufficientDetail:
      "3 mesures minimum dans les {{window}} jours de chaque côté",
  },
};

export default medication;
