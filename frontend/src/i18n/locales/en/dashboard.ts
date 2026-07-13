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
