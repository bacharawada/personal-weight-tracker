/**
 * Maps palette names to their dedicated UI accent color.
 * Must stay in sync with src/viz/palettes.py (PaletteConfig.accent).
 *
 * This color is used exclusively for interactive chrome:
 * buttons, active nav states, spinners, focus rings, titles, etc.
 * It is never used on chart traces (those use raw/smoothed/fit).
 */

export const PALETTE_ACCENT: Record<string, string> = {
  Classic:    "#2563EB",  // blue-600
  Teal:       "#0D9488",  // teal-600
  Warm:       "#D97706",  // amber-600
  Monochrome: "#374151",  // gray-700
  Forest:     "#16A34A",  // green-600
};

export function getPaletteAccent(palette: string): string {
  return PALETTE_ACCENT[palette] ?? "#2563EB";
}
