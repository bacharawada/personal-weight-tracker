/**
 * `charts` namespace (English — source of truth).
 *
 * Human-readable copy rendered inside the chart components: legend series
 * names, tooltip labels, empty states and toolbar controls. Colours, math
 * formulas and axis date/number formatting are not translated.
 */

const charts = {
  card: {
    empty: "No data available. Add measurements to get started.",
  },
  weight: {
    exportPng: "Export PNG",
    goalCrossing: "Projected to reach your goal on {{date}}",
    legend: {
      measurements: "Measurements",
      rollingMean: "Rolling mean ({{count}}-pt)",
      goal: "Goal: {{value}} kg",
    },
    tooltip: {
      weight: "Weight",
      weightValue: "{{value}} kg",
      note: "Note",
    },
  },
  derivative: {
    empty: "Not enough data to compute a rate of change.",
    legend: {
      loss: "Loss (kg/wk)",
      gain: "Gain (kg/wk)",
      smoothedRate: "Smoothed rate",
    },
    tooltip: {
      rate: "Rate",
      rateValue: "{{value}} kg/wk",
    },
  },
  residuals: {
    empty: "Residuals unavailable (select a prediction model).",
    tooltip: {
      value: "{{value}} kg",
    },
  },
  energy: {
    empty: "Not enough data to estimate an energy balance.",
    legend: {
      deficit: "Deficit (kcal/day)",
      surplus: "Surplus (kcal/day)",
    },
    tooltip: {
      balance: "Balance",
      balanceValue: "{{value}} kcal/day",
    },
  },
};

export type ChartsResource = typeof charts;

export default charts;
