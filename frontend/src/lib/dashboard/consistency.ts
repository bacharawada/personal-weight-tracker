/**
 * Weigh-in regularity — the behaviour behind the numbers.
 *
 * Nothing on the dashboard used to say whether the data was dense or full of
 * holes, yet every trend and projection depends on it. This turns the
 * measurement dates into a calendar grid plus a streak, both derived from dates
 * alone — no extra request.
 *
 * All arithmetic runs on UTC midnights keyed off the user's local calendar date,
 * so a measurement never lands on the wrong cell because of a timezone offset.
 */

import type { Measurement } from "../types";

const DAY_MS = 86_400_000;

/** How many whole weeks the grid covers. */
export const CONSISTENCY_WEEKS = 12;

/** One cell of the grid. */
export interface ConsistencyDay {
  iso: string;
  hasMeasurement: boolean;
  /** Cell outside the covered window, added to align the grid to whole weeks. */
  isPadding: boolean;
}

export interface Consistency {
  /** Weeks oldest first, each holding seven days from Monday to Sunday. */
  weeks: ConsistencyDay[][];
  /**
   * Consecutive days ending today or yesterday that carry a weigh-in. Zero once
   * the run is broken; yesterday still counts so someone who has not stepped on
   * the scale yet this morning does not watch their streak vanish.
   */
  streakDays: number;
  measurementCount: number;
  /** Calendar days from the first to the latest measurement, inclusive. */
  daysTracked: number;
}

/** UTC midnight of an ISO date, ignoring any time part. */
function toUtcDay(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

/** UTC midnight standing in for the user's local calendar date. */
function toUtcCalendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoOf(utcDay: number): string {
  return new Date(utcDay).toISOString().slice(0, 10);
}

/** Days since Monday, 0–6. */
function mondayIndex(utcDay: number): number {
  return (new Date(utcDay).getUTCDay() + 6) % 7;
}

/**
 * Build the grid and streak for `measurements` (any order), as of `now`.
 */
export function computeConsistency(
  measurements: Measurement[],
  now: Date = new Date(),
): Consistency {
  const measuredDays = new Set(measurements.map((m) => toUtcDay(m.date)));
  const today = toUtcCalendarDay(now);

  // Cover CONSISTENCY_WEEKS ending today, then pad both ends out to whole
  // Monday-to-Sunday weeks so weekdays line up in rows.
  const windowStart = today - (CONSISTENCY_WEEKS * 7 - 1) * DAY_MS;
  const gridStart = windowStart - mondayIndex(windowStart) * DAY_MS;
  const gridEnd = today + (6 - mondayIndex(today)) * DAY_MS;

  const weeks: ConsistencyDay[][] = [];
  let week: ConsistencyDay[] = [];
  for (let day = gridStart; day <= gridEnd; day += DAY_MS) {
    week.push({
      iso: isoOf(day),
      hasMeasurement: measuredDays.has(day),
      isPadding: day < windowStart || day > today,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  return {
    weeks,
    streakDays: computeStreak(measuredDays, today),
    measurementCount: measurements.length,
    daysTracked: computeDaysTracked(measuredDays),
  };
}

function computeStreak(measuredDays: Set<number>, today: number): number {
  // Anchor on today, else yesterday; anything older means the run is over.
  let cursor = today;
  if (!measuredDays.has(cursor)) cursor = today - DAY_MS;
  if (!measuredDays.has(cursor)) return 0;

  let streak = 0;
  while (measuredDays.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

function computeDaysTracked(measuredDays: Set<number>): number {
  if (measuredDays.size === 0) return 0;
  const days = [...measuredDays];
  const first = Math.min(...days);
  const last = Math.max(...days);
  return Math.round((last - first) / DAY_MS) + 1;
}
