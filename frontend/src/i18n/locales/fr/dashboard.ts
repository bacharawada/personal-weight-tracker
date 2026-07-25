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
  insight: {
    goalReached: "Vous avez atteint votre poids cible. Bravo.",
    doseWorking:
      "Dose de {{medication}} augmentée le {{date}} — votre rythme est passé de {{before}} à {{after}} depuis.",
    plateauWithHistory_one:
      "Plateau depuis {{days}} jours. Votre {{count}} plateau précédent a duré {{avgDays}} jours, et il s'est terminé.",
    plateauWithHistory_other:
      "Plateau depuis {{days}} jours. Vos {{count}} plateaux précédents ont duré {{avgDays}} jours en moyenne, et ils se sont tous terminés.",
    plateau: "Plateau depuis {{days}} jours — la tendance est plate depuis un moment.",
    gaining: "Votre poids remonte de {{rate}}.",
    behindTarget_one:
      "Vous avez {{count}} jour de retard sur votre date cible — projection actuelle au {{date}}.",
    behindTarget_other:
      "Vous avez {{count}} jours de retard sur votre date cible — projection actuelle au {{date}}.",
    onTrack: "Dans les temps pour votre date cible — projection au {{date}}.",
    projected: "À {{rate}}, vous atteignez votre objectif vers le {{date}}.",
    losing: "Perte régulière à {{rate}}.",
    streak: "{{days}} jours de pesée sans en manquer une.",
  },
  welcome: {
    title: "Votre tableau de bord commence par une pesée",
    body:
      "Tout ici se déduit de vos mesures — rien à configurer, rien à saisir à la main. Enregistrez un poids et la page se remplit.",
    steps: {
      first: "Une mesure : votre poids actuel et le calendrier des pesées",
      trend: "{{count}} mesures sur une semaine : la tendance et sa projection",
      goal:
        "Un poids cible dans les Paramètres : anneau de progression, jalons et rythme nécessaire",
      energy: "{{count}} jours d'historique : bilan énergétique et détection de plateau",
    },
    cta: "Ajouter ma première mesure",
  },
  locked: {
    needMeasurements_one: "Encore {{count}} pesée et ceci se remplit.",
    needMeasurements_other: "Encore {{count}} pesées et ceci se remplit.",
    needDays_one: "Encore {{count}} jour de suivi et ceci se remplit.",
    needDays_other: "Encore {{count}} jours de suivi et ceci se remplit.",
    needGoal: "Définissez un poids cible dans les Paramètres pour débloquer ceci.",
    needHeight: "Ajoutez votre taille dans les Paramètres pour débloquer ceci.",
  },
  trajectory: {
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
    label: "Objectif",
    onTrack: "Sur la bonne voie",
    behind: "En retard",
    reached: "Atteint",
    remaining: "Reste {{value}}",
    projectedDate: "Projeté au {{date}}",
    ringLabel: "{{percent}} % du chemin vers votre objectif",
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
  timeline: {
    label: "Historique",
    empty: "Les jalons, plateaux et changements de dose apparaîtront ici.",
    start: "Début du suivi",
    milestone: "Jalon {{index}} franchi",
    plateau_one: "Plateau de {{count}} jour",
    plateau_other: "Plateau de {{count}} jours",
    plateauUntil: "Jusqu'au {{date}}",
    doseStarted: "{{medication}} démarré à {{dose}}",
    doseChanged: "{{medication}} {{from}} → {{to}}",
    paceShift: "Rythme {{before}} → {{after}}",
    more_one: "+{{count}} évènement antérieur",
    more_other: "+{{count}} évènements antérieurs",
  },
  consistency: {
    label: "Régularité",
    streak_zero: "Aucune série en cours",
    streak_one: "{{count}} jour de série",
    streak_other: "{{count}} jours de série",
    summary_one: "{{count}} pesée sur {{weeks}} semaines",
    summary_other: "{{count}} pesées sur {{weeks}} semaines",
    daysTracked_one: "Suivi depuis {{count}} jour",
    daysTracked_other: "Suivi depuis {{count}} jours",
  },
  momentum: {
    label: "Momentum",
    barsLabel: "Variation hebdomadaire sur les {{count}} dernières semaines",
    losingWeeks: "{{losing}} semaines de perte sur {{total}}",
  },
  pace: {
    label: "Rythme",
    required: "requis {{value}}",
    typicalRange: "Plage de perte usuelle {{from}}–{{to}} {{unit}}/semaine",
    meterLabel: "Rythme actuel {{value}}",
    insufficient: "Ajoutez quelques mesures pour voir votre rythme.",
    noTargetDate:
      "Définissez une date cible dans les Paramètres pour voir le rythme nécessaire.",
    targetDatePassed: "Votre date cible est dépassée.",
    badge: {
      onTrack: "Rythme suffisant",
      tooSlow: "Trop lent",
      notMoving: "À l'arrêt",
    },
  },
  bmi: {
    label: "Indice de masse corporelle",
    addMeasurement: "Ajoutez une mesure pour voir votre IMC.",
    atGoal: "{{value}} à l'objectif",
    scaleLabel: "IMC {{value}}, {{category}}",
    category: {
      underweight: "Insuffisance pondérale",
      normal: "Corpulence normale",
      overweight: "Surpoids",
      obese: "Obésité",
    },
  },
  milestones: {
    label: "Jalons",
    counter: "{{achieved}}/{{total}}",
  },
  plateau: {
    plateauBadge_one: "Plateau depuis {{count}} jour",
    plateauBadge_other: "Plateau depuis {{count}} jours",
    losingBadge: "Perte régulière",
    gainingBadge: "Reprise",
    recentRate: "Taux récent",
    historySummary_one: "{{count}} plateau passé, moy. {{avgDays}} jour",
    historySummary_other: "{{count}} plateaux passés, moy. {{avgDays}} jours",
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
    sparklineLabel: "Évolution du bilan quotidien estimé",
    window_one: "Sur le dernier jour",
    window_other: "Sur les {{count}} derniers jours",
    insufficient:
      "Ajoutez quelques semaines de mesures pour estimer votre bilan énergétique.",
  },
};

export default dashboard;
