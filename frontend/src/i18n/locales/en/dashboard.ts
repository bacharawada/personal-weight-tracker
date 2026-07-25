/**
 * `dashboard` namespace (English — source of truth).
 *
 * Copy for the dashboard page: page title/subtitle, stat card labels, the
 * goal-progress panel, and the BMI panel (including standard BMI category
 * names).
 */

const dashboard = {
  page: {
    title: "Dashboard",
    subtitle: "Overview of your weight progression",
  },
  trajectory: {
    label: "Trajectory",
    currentWeight: "Current weight",
    noWeight: "Add a measurement to start your trajectory.",
    last7Days: "7 days",
    last30Days: "30 days",
    sinceStart: "Since start",
    // Shown in place of a delta when the window has no earlier measurement.
    noComparison: "—",
  },
  stats: {
    totalLoss: "Total Loss",
    avgLossPerWeek: "Avg Loss/Week",
    currentTrend: "Current Trend",
    daysTracked: "Days Tracked",
    measurements: "Measurements",
  },
  goal: {
    setupPrompt:
      "Set a goal weight and height in Settings to track your progress and BMI.",
    label: "Goal",
    onTrack: "On track",
    behind: "Behind",
    reached: "Reached",
    remaining: "{{value}} to go",
    projectedDate: "Projected {{date}}",
    ringLabel: "{{percent}}% of the way to your goal",
    daysToGo_one: "~{{count}} day to go",
    daysToGo_other: "~{{count}} days to go",
    // Projection summaries. The backend returns a status plus raw numbers;
    // `goal` and `rate` arrive already converted to the user's unit and `date`
    // already formatted to their date preference.
    status: {
      noGoal: "No goal weight set.",
      noData: "Add measurements to project your goal.",
      alreadyReached: "Goal already reached.",
      insufficientData: "Not enough data yet to model a reliable projection.",
      notTrendingDown:
        "Your weight isn't trending down over the last {{weeks}} weeks, so {{goal}} isn't projectable yet.",
      beyondHorizon:
        "At about {{rate}}, {{goal}} is over {{years}} years away — too far out to project reliably.",
      onTrack: "On track to reach {{goal}} by {{date}} at about {{rate}}.",
      behindTarget_one:
        "Behind target: at about {{rate}} you'd reach {{goal}} on {{date}}, {{count}} day after your target.",
      behindTarget_other:
        "Behind target: at about {{rate}} you'd reach {{goal}} on {{date}}, {{count}} days after your target.",
      projected: "At about {{rate}} you're on track to reach {{goal}} around {{date}}.",
    },
    range: {
      between: "Between {{from}} and {{to}}.",
      earliest: "{{date}} at the earliest; later if your rate slows.",
    },
  },
  pace: {
    label: "Pace",
    required: "needed {{value}}",
    typicalRange: "Typical loss range {{from}}–{{to}} {{unit}}/week",
    meterLabel: "Current pace {{value}}",
    insufficient: "Add a few more measurements to see your pace.",
    noTargetDate: "Set a target date in Settings to see the pace you need.",
    targetDatePassed: "Your target date has passed.",
    badge: {
      onTrack: "Fast enough",
      tooSlow: "Too slow",
      notMoving: "Not moving",
    },
  },
  bmi: {
    label: "Body Mass Index",
    addMeasurement: "Add a measurement to see your BMI.",
    category: {
      underweight: "Underweight",
      normal: "Normal",
      overweight: "Overweight",
      obese: "Obese",
    },
  },
  milestones: {
    label: "Milestones",
    setupPrompt:
      "Set a goal weight in Settings to track your milestones.",
    counter: "{{achieved}}/{{total}}",
    nextMilestone: "Next milestone",
    kgRemaining: "{{value}} to go",
    allAchieved: "All milestones reached — goal achieved!",
    startWeight: "Start",
    goalWeight: "Goal",
  },
  plateau: {
    cardLabel: "Plateau Status",
    plateauBadge_one: "Plateau for {{count}} day",
    plateauBadge_other: "Plateau for {{count}} days",
    losingBadge: "Steady loss",
    gainingBadge: "Regaining",
    recentRate: "Recent rate",
    historySummary_one: "{{count}} past plateau, avg {{avgDays}} day",
    historySummary_other: "{{count}} past plateaus, avg {{avgDays}} days",
    noHistory: "No past plateaus in your history yet.",
    historyUnavailable: "Not enough history to look for past plateaus.",
    explainer:
      "A plateau: your trend has stayed within 0.1 kg/week for at least 14 days.",
    insufficientData: "Add a few more measurements to see your plateau status.",
  },
  energy: {
    label: "Estimated energy balance",
    deficit: "Deficit ~{{value}} kcal/day",
    surplus: "Surplus ~{{value}} kcal/day",
    maintenance: "Roughly at maintenance",
    range: "{{low}} to {{high}} kcal/day",
    insufficient:
      "Add a few weeks of measurements to estimate your energy balance.",
  },
};

export type DashboardResource = typeof dashboard;

export default dashboard;
