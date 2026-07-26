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

/** One column of the grid: a Monday-to-Sunday week. */
export interface ConsistencyWeek {
  /** ISO date of the Monday the week starts on. */
  iso: string;
  days: ConsistencyDay[];
  /** At least one weigh-in inside the covered window — the week counts. */
  isCovered: boolean;
}

export interface Consistency {
  /** Weeks oldest first, each holding seven days from Monday to Sunday. */
  weeks: ConsistencyWeek[];
  /**
   * Consecutive weeks ending with this one or the last that carry a weigh-in.
   * One measurement is enough to hold a week: the scale is a weekly habit, not
   * a daily one, and a week still running never breaks a live streak.
   */
  streakWeeks: number;
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

/** UTC midnight of the Monday opening the week that holds `utcDay`. */
function weekStart(utcDay: number): number {
  return utcDay - mondayIndex(utcDay) * DAY_MS;
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

  const weeks: ConsistencyWeek[] = [];
  let days: ConsistencyDay[] = [];
  for (let day = gridStart; day <= gridEnd; day += DAY_MS) {
    days.push({
      iso: isoOf(day),
      hasMeasurement: measuredDays.has(day),
      isPadding: day < windowStart || day > today,
    });
    if (days.length === 7) {
      weeks.push(toWeek(days));
      days = [];
    }
  }
  if (days.length > 0) weeks.push(toWeek(days));

  return {
    weeks,
    streakWeeks: computeStreakWeeks(measuredDays, today),
    measurementCount: measurements.length,
    daysTracked: computeDaysTracked(measuredDays),
  };
}

function toWeek(days: ConsistencyDay[]): ConsistencyWeek {
  return {
    iso: days[0].iso,
    days,
    isCovered: days.some((day) => !day.isPadding && day.hasMeasurement),
  };
}

function computeStreakWeeks(measuredDays: Set<number>, today: number): number {
  const measuredWeeks = new Set([...measuredDays].map(weekStart));

  // Anchor on the current week, else the previous one: a week that has not run
  // its course yet cannot be counted as missed.
  let cursor = weekStart(today);
  if (!measuredWeeks.has(cursor)) cursor -= 7 * DAY_MS;

  let streak = 0;
  while (measuredWeeks.has(cursor)) {
    streak += 1;
    cursor -= 7 * DAY_MS;
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
