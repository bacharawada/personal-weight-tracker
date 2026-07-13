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
  milestones: {
    label: "Jalons",
    setupPrompt:
      "Définissez un poids cible dans les Paramètres pour suivre vos jalons.",
    counter: "{{achieved}}/{{total}}",
    nextMilestone: "Prochain jalon",
    kgRemaining: "{{value}} restant",
    allAchieved: "Tous les jalons atteints — objectif atteint !",
    startWeight: "Départ",
    goalWeight: "Objectif",
  },
  plateau: {
    cardLabel: "Statut du plateau",
    plateauBadge_one: "Plateau depuis {{count}} jour",
    plateauBadge_other: "Plateau depuis {{count}} jours",
    losingBadge: "Perte régulière",
    gainingBadge: "Reprise",
    recentRate: "Taux récent",
    historySummary_one: "{{count}} plateau passé, moy. {{avgDays}} jour",
    historySummary_other: "{{count}} plateaux passés, moy. {{avgDays}} jours",
    noHistory: "Aucun plateau détecté dans votre historique pour le moment.",
    historyUnavailable: "Pas assez d'historique pour rechercher d'anciens plateaux.",
    explainer:
      "Un plateau : votre tendance est restée sous 0,1 kg/semaine pendant au moins 14 jours.",
    insufficientData: "Ajoutez quelques mesures pour voir votre statut de plateau.",
  },
};

export default dashboard;
