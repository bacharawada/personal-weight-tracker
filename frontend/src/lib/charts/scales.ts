/**
 * Scale and tick helpers for the custom SVG charts.
 *
 * Thin wrappers over `d3-scale` that add manual-domain / manual-step support
 * (the user can pin an axis to fixed start/end/step values). All x-values are
 * epoch milliseconds; date strings are parsed once at the call site.
 */

import { scaleLinear, scaleTime } from "d3-scale";
import type { DateAxisConfig, ValueAxisConfig } from "../types";

const DAY_MS = 86_400_000;

/** Parse an ISO date string to epoch milliseconds. */
export function toMs(isoDate: string): number {
  return new Date(isoDate).getTime();
}

function safeExtent(values: number[], fallback: [number, number]): [number, number] {
  if (values.length === 0) return fallback;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

/**
 * Resolve the value (y) domain from data plus optional manual overrides.
 * A small symmetric padding is added to the auto-derived edges so points
 * never sit exactly on the frame.
 */
export function resolveValueDomain(
  values: number[],
  cfg: ValueAxisConfig,
  padFraction = 0.06,
): [number, number] {
  const [dataMin, dataMax] = safeExtent(values, [0, 1]);
  const span = dataMax - dataMin || 1;
  const pad = span * padFraction;
  let min = cfg.min ?? dataMin - pad;
  let max = cfg.max ?? dataMax + pad;
  if (min >= max) {
    min -= 1;
    max += 1;
  }
  return [min, max];
}

/** Resolve the date (x) domain from data plus optional manual overrides. */
export function resolveDateDomain(
  dateMs: number[],
  cfg: DateAxisConfig,
): [number, number] {
  const fallback: [number, number] = [Date.UTC(2025, 0, 1), Date.UTC(2025, 11, 31)];
  const [dataMin, dataMax] = safeExtent(dateMs, fallback);
  const min = cfg.min ? toMs(cfg.min) : dataMin;
  let max = cfg.max ? toMs(cfg.max) : dataMax;
  if (min >= max) {
    max = min + DAY_MS;
  }
  return [min, max];
}

/** Build a d3 linear scale mapping the domain onto `[0, pixels]` (or inverted). */
export function linearScale(domain: [number, number], range: [number, number]) {
  return scaleLinear().domain(domain).range(range);
}

/** Build a d3 time scale mapping epoch-ms domain onto a pixel range. */
export function timeScale(domain: [number, number], range: [number, number]) {
  return scaleTime()
    .domain([new Date(domain[0]), new Date(domain[1])])
    .range(range);
}

/** Linear-axis ticks honouring a manual step, else d3's nice defaults. */
export function valueTicks(
  domain: [number, number],
  step: number | null,
  approxCount = 6,
): number[] {
  const [lo, hi] = domain;
  if (step && step > 0) {
    const ticks: number[] = [];
    const start = Math.ceil(lo / step) * step;
    for (let v = start; v <= hi + step * 1e-6; v += step) {
      ticks.push(Number(v.toFixed(6)));
    }
    return ticks;
  }
  return scaleLinear().domain(domain).ticks(approxCount);
}

/** Time-axis ticks honouring a manual day-step, else d3's nice defaults. */
export function dateTicks(
  domain: [number, number],
  stepDays: number | null,
  approxCount = 6,
): number[] {
  const [lo, hi] = domain;
  if (stepDays && stepDays > 0) {
    const stepMs = stepDays * DAY_MS;
    const ticks: number[] = [];
    for (let t = lo; t <= hi + 1; t += stepMs) ticks.push(t);
    return ticks;
  }
  return scaleTime()
    .domain([new Date(lo), new Date(hi)])
    .ticks(approxCount)
    .map((d) => d.getTime());
}
