/** Bounds of the user-tunable weight-chart height, in CSS pixels. */
export const CHART_HEIGHT_MIN = 260;
export const CHART_HEIGHT_MAX = 1000;
export const CHART_HEIGHT_STEP = 20;

/** Mirrors Tailwind's `md` breakpoint. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** Desktop default: tall enough for a 1 kg gridline step to stay legible. */
const DESKTOP_DEFAULT_HEIGHT = 800;

/**
 * The height the weight chart uses until the user drags the slider. Resolved
 * from the viewport once: a phone keeps the compact height it shipped with, a
 * desktop gets the airy frame the fine weight step needs.
 *
 * Returns:
 *     The default chart height in CSS pixels.
 */
export function defaultChartHeight(): number {
  return window.matchMedia(DESKTOP_QUERY).matches ? DESKTOP_DEFAULT_HEIGHT : CHART_HEIGHT_MIN;
}
