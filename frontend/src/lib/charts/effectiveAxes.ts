/**
 * Resolve the concrete axis values a weight chart actually renders.
 *
 * The chart body derives its domains and tick steps internally from the data
 * plus the (possibly partial) manual overrides in `ChartAxes`. This module
 * surfaces those same resolved values so the axis-control inputs can always
 * display the current state — never a blank "auto" field — while staying in
 * lock-step with what is drawn.
 */

import type {
  ChartAxes,
  EffectiveAxes,
  WeightChartData,
} from "../types";
import {
  dateTicks,
  resolveDateDomain,
  resolveValueDomain,
  toMs,
  valueTicks,
} from "./scales";

const DAY_MS = 86_400_000;

/** Round to one decimal, dropping float noise (68.2400001 → 68.2). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Format epoch milliseconds as an ISO date (YYYY-MM-DD) in UTC. */
function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Collect every x (date, as epoch ms) and y (weight) value the chart plots,
 * across raw points, smoothed line, model fits/projections/bands, the goal
 * line and asymptotes. Mirrors the collection done in `WeightChartBody` so the
 * resolved domains match the rendered ones exactly.
 */
export function collectChartDomains(data: WeightChartData): {
  dateMs: number[];
  values: number[];
} {
  const dateMs: number[] = [
    ...data.raw.map((p) => toMs(p.date)),
    ...data.models.flatMap((m) => m.projection.map((p) => toMs(p.date))),
  ];
  const values: number[] = [
    ...data.raw.map((p) => p.value),
    ...data.smoothed.map((p) => p.value),
    ...data.models.flatMap((m) => [
      ...m.fit.map((p) => p.value),
      ...m.projection.map((p) => p.value),
      ...m.band.flatMap((b) => [b.lower, b.upper]),
    ]),
  ];
  if (data.goal_weight != null) values.push(data.goal_weight);
  for (const m of data.models) {
    if (m.asymptote != null) values.push(m.asymptote);
  }
  return { dateMs, values };
}

/** Tick spacing (in days) between the first two date ticks, or null. */
function dateStepDays(ticks: number[]): number | null {
  if (ticks.length < 2) return null;
  return Math.max(1, Math.round((ticks[1] - ticks[0]) / DAY_MS));
}

/** Tick spacing between the first two value ticks, or null. */
function valueStep(ticks: number[]): number | null {
  if (ticks.length < 2) return null;
  return round1(ticks[1] - ticks[0]);
}

/**
 * Resolve the concrete min / max / step the chart uses for both axes, applying
 * any manual overrides in `axes` exactly as the renderer does.
 *
 * Args:
 *   data: The chart payload, or null before the first load.
 *   axes: The current (possibly partial) axis overrides.
 *
 * Returns:
 *   Concrete axis values ready to fill the controls, or null when there is no
 *   data to resolve against (empty chart).
 */
export function resolveEffectiveAxes(
  data: WeightChartData | null,
  axes: ChartAxes,
): EffectiveAxes | null {
  if (!data || data.raw.length === 0) return null;

  const { dateMs, values } = collectChartDomains(data);
  const xDomain = resolveDateDomain(dateMs, axes.x);
  const yDomain = resolveValueDomain(values, axes.y);

  return {
    x: {
      min: toIsoDate(xDomain[0]),
      max: toIsoDate(xDomain[1]),
      stepDays: dateStepDays(dateTicks(xDomain, axes.x.stepDays)),
    },
    y: {
      min: round1(yDomain[0]),
      max: round1(yDomain[1]),
      step: valueStep(valueTicks(yDomain, axes.y.step)),
    },
  };
}
