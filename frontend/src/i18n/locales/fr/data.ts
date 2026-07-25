/**
 * `data` namespace (French).
 *
 * Mirrors the English `data` resource key-for-key.
 */

import type { DataResource } from "../en/data";

const data: DataResource = {
  page: {
    title: "Données",
    subtitle_one: "{{count}} mesure enregistrée",
    subtitle_other: "{{count}} mesures enregistrées",
  },
  table: {
    date: "Date",
    weight: "Poids ({{unit}})",
    note: "Note",
    actions: "Actions",
    empty: "Aucune mesure pour l'instant.",
    addFirst: "Ajoutez la première",
  },
  toolbar: {
    deleteAll: "Tout supprimer",
    exportCsv: "Exporter CSV",
  },
  picker: {
    measurementsTitle: "Mesures de poids",
  },
  panel: {
    addEntry: "Ajouter une mesure",
  },
  actionCard: {
    importTitle: "Importer CSV",
  },
  row: {
    editWeight: "Modifier",
    notePlaceholder: "Ajouter une note…",
  },
  addModal: {
    title: "Ajouter une mesure",
    description: "Saisissez une date et votre poids.",
  },
  csvModal: {
    title: "Importer CSV",
    description:
      "Chargez un fichier CSV avec les colonnes <code>date</code> et <code>weight</code>. Le séparateur et le format de date sont détectés automatiquement.",
  },
  deleteModal: {
    title: "Supprimer la mesure",
    description:
      "Voulez-vous vraiment supprimer la mesure du <strong>{{date}}</strong> ({{weight}} kg) ? Cette action est irréversible.",
    confirmLabel: "Supprimer",
  },
  deleteAllModal: {
    title: "Supprimer toutes les mesures",
    description_one:
      "Cela supprimera définitivement <strong>{{count}} mesure</strong>. Cette action est irréversible.",
    description_other:
      "Cela supprimera définitivement les <strong>{{count}} mesures</strong>. Cette action est irréversible.",
    confirmLabel: "Tout supprimer",
  },
  form: {
    heading: "Ajouter une mesure",
    dateLabel: "Date",
    weightLabel: "Poids ({{unit}})",
    weightPlaceholderLb: "ex. 165",
    weightPlaceholderKg: "ex. 75,5",
    noteLabel: "Note (facultatif)",
    notePlaceholder: "ex. après les vacances",
    submitAdding: "Ajout…",
    submitAdd: "Ajouter",
    errorFillBoth: "Veuillez renseigner la date et le poids.",
    errorRange: "Le poids doit être compris entre {{min}} et {{max}} {{unit}}.",
    errorUnknown: "Erreur inconnue",
    added: "Ajouté : {{date}} — {{weight}} {{unit}}",
  },
};

export default data;
