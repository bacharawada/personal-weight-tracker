/**
 * Maps palette names to their accent (smoothed) color for use in the UI.
 * Must stay in sync with src/viz/palettes.py.
 */

export const PALETTE_ACCENT: Record<string, string> = {
  Classic:    "#C97A0A",
  Teal:       "#26A69A",
  Warm:       "#FF8F00",
  Monochrome: "#757575",
  Forest:     "#558B2F",
};

export function getPaletteAccent(palette: string): string {
  return PALETTE_ACCENT[palette] ?? "#2563eb";
}
