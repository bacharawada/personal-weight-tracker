/** Bounds of the user-tunable weight-chart height, in CSS pixels. */
export const CHART_HEIGHT_MIN = 260;
export const CHART_HEIGHT_MAX = 1000;
export const CHART_HEIGHT_STEP = 20;

/** Mirrors Tailwind's `md` breakpoint. */
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * The height the weight chart uses until the user drags the slider. Resolved from
 * the viewport once, reproducing the responsive default the chart shipped with
 * (`h-[260px] md:h-[380px]`) so the initial render is unchanged.
 *
 * Returns:
 *     The default chart height in CSS pixels.
 */
export function defaultChartHeight(): number {
  return window.matchMedia(DESKTOP_QUERY).matches ? 380 : CHART_HEIGHT_MIN;
}
