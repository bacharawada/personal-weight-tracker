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

import { DateOrder, DateSegment, DateSeparator } from "./types";
import type { DateSegmentValues, DisplayPreferences } from "./types";

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

/* -------------------------------------------------------------------------
 * Segmented date entry
 *
 * The date picker lets the user type a date into three separate fields. These
 * helpers are the pure part of that: ordering the fields, splitting an ISO
 * date into digit buffers, and folding the buffers back into an ISO date.
 * ---------------------------------------------------------------------- */

/** Per-segment bounds and digit count, used for stepping and auto-advancing. */
export const SEGMENT_LIMITS: Record<
  DateSegment,
  { min: number; max: number; length: number; wraps: boolean }
> = {
  [DateSegment.Day]: { min: 1, max: 31, length: 2, wraps: true },
  [DateSegment.Month]: { min: 1, max: 12, length: 2, wraps: true },
  // Stepping stays in a plausible range; typing is only bound by the 4 digits.
  [DateSegment.Year]: { min: 1900, max: 2999, length: 4, wraps: false },
};

export const EMPTY_DATE_SEGMENTS: DateSegmentValues = {
  [DateSegment.Day]: "",
  [DateSegment.Month]: "",
  [DateSegment.Year]: "",
};

/** The segments left-to-right, in the order the user's preference displays. */
export function dateSegmentOrder(order: DateOrder): readonly DateSegment[] {
  if (order === DateOrder.Ymd) {
    return [DateSegment.Year, DateSegment.Month, DateSegment.Day];
  }
  if (order === DateOrder.Mdy) {
    return [DateSegment.Month, DateSegment.Day, DateSegment.Year];
  }
  return [DateSegment.Day, DateSegment.Month, DateSegment.Year];
}

/** Split an ISO date into zero-padded buffers; all empty when unset or malformed. */
export function isoToSegments(iso: string | null): DateSegmentValues {
  if (!iso) return { ...EMPTY_DATE_SEGMENTS };
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return { ...EMPTY_DATE_SEGMENTS };
  const [year, month, day] = parts;
  return { year, month, day };
}

/** True when the user has not typed a single digit in any segment. */
export function isEmptySegments(segments: DateSegmentValues): boolean {
  return !segments.day && !segments.month && !segments.year;
}

/**
 * Fold the segment buffers back into an ISO `YYYY-MM-DD` date.
 *
 * Returns `null` when a segment is still incomplete, or when the combination
 * is not a real calendar day. The round-trip through `Date` is what catches
 * 31 February and 29 February on a common year: those roll over to March, so
 * the components no longer match what was typed.
 */
export function segmentsToIso(segments: DateSegmentValues): string | null {
  if (segments.year.length !== SEGMENT_LIMITS.year.length) return null;
  if (!segments.month || !segments.day) return null;

  const year = Number(segments.year);
  const month = Number(segments.month);
  const day = Number(segments.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  // `new Date(year, …)` remaps years below 100 into the 1900s; setFullYear does not.
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return localDateToIso(date);
}

/**
 * Increment or decrement one segment by `delta`.
 *
 * An empty buffer lands on today's value for that segment rather than on
 * `today ± 1`, matching what a native date input does. Day and month wrap
 * around their bounds; the year clamps, since wrapping from 1900 to 2999 is
 * never what the user meant.
 */
export function stepSegment(
  segment: DateSegment,
  raw: string,
  delta: number,
  today: Date,
): string {
  const { min, max, length, wraps } = SEGMENT_LIMITS[segment];
  const todayValue =
    segment === DateSegment.Day
      ? today.getDate()
      : segment === DateSegment.Month
        ? today.getMonth() + 1
        : today.getFullYear();

  const base = Number(raw);
  if (raw === "" || !Number.isInteger(base)) {
    return String(todayValue).padStart(length, "0");
  }

  let next = base + delta;
  if (wraps) {
    const span = max - min + 1;
    next = ((((next - min) % span) + span) % span) + min;
  } else {
    next = Math.min(max, Math.max(min, next));
  }
  return String(next).padStart(length, "0");
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
