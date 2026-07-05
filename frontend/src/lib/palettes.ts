/**
 * Chart colour palettes — the single source of truth for trace colours.
 *
 * Rendering is fully client-side, so palettes live here (they used to live in
 * the backend `viz/palettes.py`). Each palette assigns a colour to every chart
 * trace; `accent` is reserved for interactive chrome (buttons, focus rings,
 * titles) and is never used on a trace.
 */

export interface ChartPalette {
  name: string;
  /** Primary UI accent — chrome only, never a chart trace. */
  accent: string;
  raw: string;
  smoothed: string;
  fit: string;
  fitLinear: string;
  band: string;
  derivative: string;
  derivativePos: string;
  derivativeSmooth: string;
  residualAbove: string;
  residualBelow: string;
}

export const PALETTES: Record<string, ChartPalette> = {
  Classic: {
    name: "Classic",
    accent: "#2563EB",
    raw: "#2E6DB4",
    smoothed: "#C97A0A",
    fit: "#2CA02C",
    fitLinear: "#9467BD",
    band: "#94A3B8",
    derivative: "#1E8C5E",
    derivativePos: "#E07070",
    derivativeSmooth: "#136644",
    residualAbove: "#F0C060",
    residualBelow: "#70D0A0",
  },
  Teal: {
    name: "Teal",
    accent: "#0D9488",
    raw: "#00897B",
    smoothed: "#26A69A",
    fit: "#004D40",
    fitLinear: "#5E35B1",
    band: "#80CBC4",
    derivative: "#00695C",
    derivativePos: "#EF5350",
    derivativeSmooth: "#00796B",
    residualAbove: "#FFB74D",
    residualBelow: "#4DB6AC",
  },
  Warm: {
    name: "Warm",
    accent: "#D97706",
    raw: "#E65100",
    smoothed: "#FF8F00",
    fit: "#BF360C",
    fitLinear: "#6A1B9A",
    band: "#FFCC80",
    derivative: "#D84315",
    derivativePos: "#C62828",
    derivativeSmooth: "#A1887F",
    residualAbove: "#FFE082",
    residualBelow: "#FFAB91",
  },
  Monochrome: {
    name: "Monochrome",
    accent: "#374151",
    raw: "#424242",
    smoothed: "#757575",
    fit: "#1565C0",
    fitLinear: "#6D4C41",
    band: "#BDBDBD",
    derivative: "#616161",
    derivativePos: "#EF5350",
    derivativeSmooth: "#9E9E9E",
    residualAbove: "#E0E0E0",
    residualBelow: "#BDBDBD",
  },
  Forest: {
    name: "Forest",
    accent: "#16A34A",
    raw: "#2E7D32",
    smoothed: "#558B2F",
    fit: "#33691E",
    fitLinear: "#6A1B9A",
    band: "#A5D6A7",
    derivative: "#388E3C",
    derivativePos: "#D84315",
    derivativeSmooth: "#1B5E20",
    residualAbove: "#A5D6A7",
    residualBelow: "#81C784",
  },
};

export const PALETTE_NAMES: string[] = Object.keys(PALETTES);

/** Three representative swatches per palette for the picker preview. */
export const PALETTE_PREVIEWS: Record<string, string[]> = Object.fromEntries(
  Object.values(PALETTES).map((p) => [p.name, [p.raw, p.smoothed, p.fit]]),
);

export function getPalette(name: string): ChartPalette {
  return PALETTES[name] ?? PALETTES.Classic;
}

export function getPaletteAccent(name: string): string {
  return getPalette(name).accent;
}

/** Theme-neutral colours (axes, gridlines, text, tooltip) per light/dark mode. */
export interface ChartTheme {
  axis: string;
  grid: string;
  text: string;
  mutedText: string;
  reference: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
}

const LIGHT_THEME: ChartTheme = {
  axis: "#94A3B8",
  grid: "#E2E8F0",
  text: "#334155",
  mutedText: "#64748B",
  reference: "#94A3B8",
  tooltipBg: "#FFFFFF",
  tooltipText: "#1E293B",
  tooltipBorder: "#E2E8F0",
};

const DARK_THEME: ChartTheme = {
  axis: "#475569",
  grid: "#334155",
  text: "#CBD5E1",
  mutedText: "#94A3B8",
  reference: "#64748B",
  tooltipBg: "#1E293B",
  tooltipText: "#F1F5F9",
  tooltipBorder: "#334155",
};

export function getChartTheme(dark: boolean): ChartTheme {
  return dark ? DARK_THEME : LIGHT_THEME;
}

/** Convert a `#RRGGBB` hex colour to an `rgba(...)` string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
