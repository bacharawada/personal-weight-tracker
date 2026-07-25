/**
 * Where a projected series crosses the goal weight.
 *
 * The projection is a polyline sampled at whole days, so the crossing almost
 * never lands exactly on a sample. This finds the first pair of consecutive
 * points that straddle the goal and interpolates linearly between them, which
 * is the same straight segment the chart draws — so the returned instant always
 * sits on the rendered line.
 */

import { toMs } from "./scales";

export interface GoalCrossing {
  /** Epoch milliseconds of the interpolated crossing. */
  ms: number;
}

interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * First crossing of `goal` along `points`, or `null` when the series never
 * reaches it (the usual case for a horizon shorter than the remaining road).
 *
 * Direction-agnostic: it detects the sign change, so a goal above the current
 * weight is found the same way as one below.
 */
export function findGoalCrossing(
  points: SeriesPoint[],
  goal: number,
): GoalCrossing | null {
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const before = previous.value - goal;
    const after = current.value - goal;

    if (before === 0) return { ms: toMs(previous.date) };
    if (after === 0) return { ms: toMs(current.date) };
    // Same side of the goal — no crossing in this segment.
    if (before < 0 === after < 0) continue;

    const previousMs = toMs(previous.date);
    const fraction = before / (before - after);
    return { ms: previousMs + (toMs(current.date) - previousMs) * fraction };
  }
  return null;
}
