/**
 * Date-range windows for the weight chart.
 *
 * Shared by the axis controls' quick ranges (user-picked) and the dashboard's
 * default view (fixed window), so both frame a period identically.
 */

import { AUTO_AXES, type ChartAxes, type ChartPoint, type WeightChartData } from "../types";
import { toMs } from "./scales";

const DAY_MS = 86_400_000;

/** Padding (in axis units) added below/above the period's extremes for a coherent zoom. */
const Y_PADDING = 5;

/** Shift an ISO date (YYYY-MM-DD) back by `days`, staying in UTC to avoid TZ drift. */
function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a coherent axis config for a range preset.
 *
 * `days === null` ("all history") is full auto — both axes fit every plotted
 * series reactively, so the extrapolation horizon is always visible without
 * pinning anything.
 *
 * For a fixed range, only the *start* of the date window is pinned (`days` back
 * from the latest measurement); the date axis end stays auto so the projection
 * is never clipped horizontally. The weight axis is fitted to every point in the
 * window — raw measurements *and* the projection — padded by ±Y_PADDING, so the
 * horizon stays on-screen vertically too.
 */
export function computeRangePreset(
  points: ChartPoint[],
  projection: ChartPoint[],
  days: number | null,
): ChartAxes {
  if (days === null || points.length === 0) return AUTO_AXES;

  const latest = points.reduce((max, p) => (p.date > max ? p.date : max), points[0].date);
  const xMin = subtractDays(latest, days);

  const weights = [...points, ...projection]
    .filter((p) => p.date >= xMin)
    .map((p) => p.value);
  const yMin = Math.floor(Math.min(...weights) - Y_PADDING);
  const yMax = Math.ceil(Math.max(...weights) + Y_PADDING);

  return {
    x: { min: xMin, max: null, stepDays: null },
    y: { min: yMin, max: yMax, step: null },
  };
}

/**
 * Frame a chart payload on its last `days` of measurements.
 *
 * Falls back to full auto-fit when the history is shorter than the window, so a
 * new account is never framed on mostly-empty space.
 *
 * Args:
 *   data: The chart payload.
 *   days: Length of the window, in days.
 *
 * Returns:
 *   The axis config for that window, or `AUTO_AXES` when it would show everything.
 */
export function rangeWindowAxes(data: WeightChartData, days: number): ChartAxes {
  if (data.raw.length === 0) return AUTO_AXES;

  const dates = data.raw.map((p) => p.date);
  const earliest = dates.reduce((min, date) => (date < min ? date : min), dates[0]);
  const latest = dates.reduce((max, date) => (date > max ? date : max), dates[0]);
  if (toMs(latest) - toMs(earliest) <= days * DAY_MS) return AUTO_AXES;

  const projection = data.models.flatMap((model) => model.projection);
  return computeRangePreset(data.raw, projection, days);
}
