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

/** A plotted value paired with the date it sits at, as epoch milliseconds. */
export interface DatedValue {
  ms: number;
  value: number;
}

export interface ChartDomains {
  /** Every plotted date, as epoch ms — the raw candidates for the x domain. */
  dateMs: number[];
  /** Values tied to a date, so they can be restricted to a visible window. */
  dated: DatedValue[];
}

/**
 * Collect every x (date, as epoch ms) and y (weight) value the chart plots,
 * across raw points, smoothed line and model fits/projections/bands. Mirrors
 * the collection done in `WeightChartBody` so the resolved domains match the
 * rendered ones exactly.
 *
 * Values keep their date so `valuesInWindow` can drop the ones a pinned date
 * window excludes. The full-width references (goal line, model asymptotes) are
 * deliberately left out: they are single levels rather than measured series,
 * and an asymptote far from the data would stretch the weight axis over an
 * empty half-frame.
 */
export function collectChartDomains(data: WeightChartData): ChartDomains {
  const dateMs: number[] = [
    ...data.raw.map((p) => toMs(p.date)),
    ...data.models.flatMap((m) => m.projection.map((p) => toMs(p.date))),
  ];
  const dated: DatedValue[] = [
    ...data.raw.map((p) => ({ ms: toMs(p.date), value: p.value })),
    ...data.smoothed.map((p) => ({ ms: toMs(p.date), value: p.value })),
    ...data.models.flatMap((m) => [
      ...m.fit.map((p) => ({ ms: toMs(p.date), value: p.value })),
      ...m.projection.map((p) => ({ ms: toMs(p.date), value: p.value })),
      ...m.band.flatMap((b) => [
        { ms: toMs(b.date), value: b.lower },
        { ms: toMs(b.date), value: b.upper },
      ]),
    ]),
  ];
  return { dateMs, dated };
}

/**
 * The values the chart actually draws inside a date window.
 *
 * Dated series are clipped to `xDomain`, so a weight axis on auto fits the
 * visible period instead of the whole history. Only measured and fitted series
 * take part: the goal line and model asymptotes are clipped to the plotting
 * area when they fall outside, rather than dragging the axis out to meet them.
 *
 * Args:
 *   domains: The collected series, from `collectChartDomains`.
 *   xDomain: The resolved date domain, as epoch ms.
 *
 * Returns:
 *   The values to fit the y axis on. Falls back to every dated value when the
 *   window contains none — a domain pinned to a gap in the data still gets a
 *   sane axis rather than the empty-extent fallback.
 */
export function valuesInWindow(
  domains: ChartDomains,
  xDomain: [number, number],
): number[] {
  const inside = domains.dated
    .filter((d) => d.ms >= xDomain[0] && d.ms <= xDomain[1])
    .map((d) => d.value);
  if (inside.length === 0) return domains.dated.map((d) => d.value);
  return inside;
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

  const domains = collectChartDomains(data);
  const xDomain = resolveDateDomain(domains.dateMs, axes.x);
  const yDomain = resolveValueDomain(valuesInWindow(domains, xDomain), axes.y);

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
