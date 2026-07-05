/**
 * `dashboard` namespace (French).
 *
 * Mirrors the English `dashboard` resource key-for-key.
 */

import type { DashboardResource } from "../en/dashboard";

const dashboard: DashboardResource = {
  page: {
    title: "Tableau de bord",
    subtitle: "Vue d'ensemble de votre progression de poids",
  },
  stats: {
    totalLoss: "Perte totale",
    avgLossPerWeek: "Perte moy./semaine",
    currentTrend: "Tendance actuelle",
    daysTracked: "Jours suivis",
    measurements: "Mesures",
  },
  goal: {
    setupPrompt:
      "Définissez un poids cible et une taille dans les Paramètres pour suivre votre progression et votre IMC.",
    label: "Objectif",
    onTrack: "Sur la bonne voie",
    behind: "En retard",
    daysToGo_one: "~{{count}} jour restant",
    daysToGo_other: "~{{count}} jours restants",
  },
  bmi: {
    label: "Indice de masse corporelle",
    addMeasurement: "Ajoutez une mesure pour voir votre IMC.",
    category: {
      underweight: "Insuffisance pondérale",
      normal: "Corpulence normale",
      overweight: "Surpoids",
      obese: "Obésité",
    },
  },
};

export default dashboard;
