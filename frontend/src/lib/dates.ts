/**
 * Date display helpers.
 *
 * Dates are always stored and exchanged with the backend as ISO `YYYY-MM-DD`.
 * These helpers reorder the fields for display according to the user's
 * preference at the UI edge, so the rest of the app keeps working in ISO.
 *
 * The formatting is pure string manipulation on the ISO form — no `Date`
 * object is involved, so a displayed date can never drift by a day because of
 * the viewer's timezone. Epoch-millisecond inputs (chart ticks and hover
 * points) are read in UTC, matching how `lib/charts/scales.toMs` parses the
 * ISO dates in the first place.
 */

import { DateOrder, DateSeparator } from "./types";
import type { DisplayPreferences } from "./types";

/** Fallback used before the profile has loaded, and on the share page. */
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  unit_preference: "kg",
  date_order: DateOrder.Dmy,
  date_separator: DateSeparator.Slash,
};

/** The separator actually used: the ISO order always renders with a dash. */
export function effectiveSeparator(
  order: DateOrder,
  separator: DateSeparator,
): DateSeparator {
  return order === DateOrder.Ymd ? DateSeparator.Dash : separator;
}

/**
 * Format an ISO `YYYY-MM-DD` date for display.
 *
 * Anything that is not a well-formed ISO date is returned unchanged, so a
 * malformed value shows up as-is instead of as `NaN`.
 */
export function formatIsoDate(
  iso: string,
  order: DateOrder,
  separator: DateSeparator,
): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  const sep = effectiveSeparator(order, separator);
  if (order === DateOrder.Ymd) return `${year}${sep}${month}${sep}${day}`;
  if (order === DateOrder.Mdy) return `${month}${sep}${day}${sep}${year}`;
  return `${day}${sep}${month}${sep}${year}`;
}

/**
 * Format an ISO date without the year — used for axis tick labels, where the
 * year would make the labels collide.
 */
export function formatIsoDateShort(
  iso: string,
  order: DateOrder,
  separator: DateSeparator,
): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  const sep = effectiveSeparator(order, separator);
  return order === DateOrder.Dmy ? `${day}${sep}${month}` : `${month}${sep}${day}`;
}

/** Convert an epoch-millisecond value to its ISO date in UTC. */
export function msToIsoDate(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Parse an ISO `YYYY-MM-DD` string into a `Date` at local midnight.
 *
 * `new Date("2026-12-25")` parses as **UTC** midnight, which renders as the
 * 24th in any negative-offset timezone. Building the date from its parts keeps
 * it on the intended calendar day — the form the day-picker needs.
 */
export function isoToLocalDate(iso: string): Date | undefined {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/**
 * Format a `Date` back to an ISO `YYYY-MM-DD` string from its local parts.
 *
 * The inverse of {@link isoToLocalDate}: `toISOString()` would convert to UTC
 * first and can land on the previous day, so we read the local components.
 */
export function localDateToIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format an epoch-millisecond value with the full pattern. */
export function formatMs(
  ms: number,
  order: DateOrder,
  separator: DateSeparator,
): string {
  return formatIsoDate(msToIsoDate(ms), order, separator);
}

/** Format an epoch-millisecond value without the year (axis ticks). */
export function formatMsShort(
  ms: number,
  order: DateOrder,
  separator: DateSeparator,
): string {
  return formatIsoDateShort(msToIsoDate(ms), order, separator);
}

/**
 * Human-readable sample of a format combination, for the settings preview.
 *
 * Uses a day and month that are unambiguous (25 December) so the difference
 * between the European and American orders is visible at a glance.
 */
export function formatSample(
  order: DateOrder,
  separator: DateSeparator,
): string {
  return formatIsoDate("2026-12-25", order, separator);
}
