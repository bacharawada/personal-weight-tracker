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
    daysToGo_one: "~{{count}} day to go",
    daysToGo_other: "~{{count}} days to go",
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
};

export type DashboardResource = typeof dashboard;

export default dashboard;
