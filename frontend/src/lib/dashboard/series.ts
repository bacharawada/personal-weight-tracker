/**
 * Derived weight series for the dashboard tiles.
 *
 * These read the raw measurements rather than the smoothed server series on
 * purpose: the dashboard's headline numbers answer "what does the scale say
 * versus last week", and a smoothed value would not match the figure the user
 * saw when they stepped off it.
 */

import type { Measurement } from "../types";

const DAY_MS = 86_400_000;

/**
 * Signed weight change over each headline window, in kg — negative means lost.
 * A window is `null` when no measurement predates it.
 */
export interface WeightDeltas {
  last7Days: number | null;
  last30Days: number | null;
  total: number | null;
}

/** Signed weight change across one calendar week. */
export interface WeeklyRate {
  /** ISO date of the week's first day. */
  weekStart: string;
  /** Change in kg across the week; negative means lost. */
  changeKg: number;
}

/**
 * Weight recorded on or before `targetMs`, taken from an ascending series.
 * Returns `null` when the series starts after that instant.
 */
export function weightAt(measurements: Measurement[], targetMs: number): number | null {
  let found: number | null = null;
  for (const measurement of measurements) {
    if (new Date(measurement.date).getTime() > targetMs) break;
    found = measurement.weight;
  }
  return found;
}

/** Change between the latest weight and the one recorded a window ago. */
export function computeDeltas(measurements: Measurement[]): WeightDeltas {
  if (measurements.length === 0) {
    return { last7Days: null, last30Days: null, total: null };
  }
  const latest = measurements[measurements.length - 1];
  const latestMs = new Date(latest.date).getTime();
  const since = (days: number): number | null => {
    const earlier = weightAt(measurements, latestMs - days * DAY_MS);
    return earlier == null ? null : latest.weight - earlier;
  };
  return {
    last7Days: since(7),
    last30Days: since(30),
    total: latest.weight - measurements[0].weight,
  };
}

/**
 * Week-by-week change over the last `weeks` weeks, oldest first.
 *
 * A week is skipped when no measurement predates its start — an empty bar would
 * read as "no change" when the truth is "nothing recorded".
 */
export function weeklyRates(measurements: Measurement[], weeks: number): WeeklyRate[] {
  if (measurements.length === 0) return [];

  const latestMs = new Date(measurements[measurements.length - 1].date).getTime();
  const rates: WeeklyRate[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const endMs = latestMs - index * 7 * DAY_MS;
    const startMs = endMs - 7 * DAY_MS;
    const start = weightAt(measurements, startMs);
    const end = weightAt(measurements, endMs);
    if (start == null || end == null) continue;
    rates.push({
      weekStart: new Date(startMs).toISOString().slice(0, 10),
      changeKg: end - start,
    });
  }

  return rates;
}
