/**
 * `charts` namespace (French).
 *
 * Mirrors the English `charts` resource key-for-key.
 */

import type { ChartsResource } from "../en/charts";

const charts: ChartsResource = {
  card: {
    empty: "Aucune donnée disponible. Ajoutez des mesures pour commencer.",
  },
  weight: {
    exportPng: "Exporter en PNG",
    legend: {
      measurements: "Mesures",
      rollingMean: "Moyenne mobile ({{count}} pts)",
      goal: "Objectif : {{value}} kg",
    },
    tooltip: {
      weight: "Poids",
      weightValue: "{{value}} kg",
    },
  },
  derivative: {
    empty: "Données insuffisantes pour calculer un taux de variation.",
    legend: {
      loss: "Perte (kg/sem)",
      gain: "Gain (kg/sem)",
      smoothedRate: "Taux lissé",
    },
    tooltip: {
      rate: "Taux",
      rateValue: "{{value}} kg/sem",
    },
  },
  residuals: {
    empty: "Résidus indisponibles (sélectionnez un modèle de prédiction).",
    tooltip: {
      value: "{{value}} kg",
    },
  },
};

export default charts;
