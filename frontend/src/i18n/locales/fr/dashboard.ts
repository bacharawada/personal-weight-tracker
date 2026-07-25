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
  trajectory: {
    label: "Trajectoire",
    currentWeight: "Poids actuel",
    noWeight: "Ajoutez une mesure pour démarrer votre trajectoire.",
    last7Days: "7 jours",
    last30Days: "30 jours",
    sinceStart: "Depuis le début",
    noComparison: "—",
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
    status: {
      noGoal: "Aucun poids cible défini.",
      noData: "Ajoutez des mesures pour projeter votre objectif.",
      alreadyReached: "Objectif déjà atteint.",
      insufficientData:
        "Pas encore assez de données pour une projection fiable.",
      notTrendingDown:
        "Votre poids ne baisse pas sur les {{weeks}} dernières semaines : {{goal}} n'est pas encore projetable.",
      beyondHorizon:
        "À environ {{rate}}, {{goal}} est à plus de {{years}} ans — trop loin pour une projection fiable.",
      onTrack:
        "Sur la bonne voie pour atteindre {{goal}} d'ici le {{date}}, à environ {{rate}}.",
      behindTarget_one:
        "En retard sur la cible : à environ {{rate}}, vous atteindriez {{goal}} le {{date}}, soit {{count}} jour après votre cible.",
      behindTarget_other:
        "En retard sur la cible : à environ {{rate}}, vous atteindriez {{goal}} le {{date}}, soit {{count}} jours après votre cible.",
      projected:
        "À environ {{rate}}, vous êtes en route pour atteindre {{goal}} vers le {{date}}.",
    },
    range: {
      between: "Entre le {{from}} et le {{to}}.",
      earliest: "Le {{date}} au plus tôt ; plus tard si votre rythme ralentit.",
    },
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
  energy: {
    label: "Bilan énergétique estimé",
    deficit: "Déficit ~{{value}} kcal/jour",
    surplus: "Surplus ~{{value}} kcal/jour",
    maintenance: "Proche de l'équilibre",
    range: "{{low}} à {{high}} kcal/jour",
    insufficient:
      "Ajoutez quelques semaines de mesures pour estimer votre bilan énergétique.",
  },
};

export default dashboard;
