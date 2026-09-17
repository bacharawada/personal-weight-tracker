/**
 * Shared helpers for the BMR / TDEE feature.
 *
 * The numbers themselves come from the backend (`/api/stats/metabolism`); this
 * module only holds what every renderer of those numbers needs — the ladder
 * order of the activity levels and a rounding rule — so the profile card, the
 * dashboard tile and the forms agree with each other.
 */

import { ActivityLevel } from "./types";

/** Activity levels from least to most active — the order the TDEE table renders in. */
export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  ActivityLevel.Sedentary,
  ActivityLevel.Light,
  ActivityLevel.Moderate,
  ActivityLevel.Active,
  ActivityLevel.VeryActive,
];

/**
 * Round a kcal/day figure to the nearest 10 for display.
 *
 * The formula's own error is about ±10 %, so unit precision would suggest an
 * accuracy the estimate does not have.
 */
export function roundKcal(value: number): number {
  return Math.round(value / 10) * 10;
}

/** Format a kcal/day figure with the locale's digit grouping. */
export function formatKcal(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(roundKcal(value));
}
