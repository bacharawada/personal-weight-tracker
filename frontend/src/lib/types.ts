/** TypeScript types matching the FastAPI Pydantic schemas. */

export interface Measurement {
  date: string;
  weight: number;
  note: string | null;
}

export interface MeasurementIn {
  date: string;
  weight: number;
  note?: string | null;
}

export interface MeasurementUpdate {
  weight?: number;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Medication doses (GLP-1 & co.)
// ---------------------------------------------------------------------------

export interface MedicationDose {
  id: number;
  date: string;
  medication: string;
  dose_mg: number | null;
  note: string | null;
}

export interface MedicationDoseIn {
  date: string;
  medication: string;
  dose_mg: number | null;
  note: string | null;
}

// Common GLP-1 molecule suggestions offered via a datalist. Free text is still
// allowed — these only pre-populate the input. `as const` keeps it a literal
// tuple (the project bans TS enums via erasableSyntaxOnly).
export const MEDICATION_SUGGESTIONS = [
  "semaglutide",
  "tirzepatide",
  "liraglutide",
  "dulaglutide",
] as const;

// One row of the dose-change impact analysis (kg/week; negative = losing).
// A `null` slope means that side of the window had too few measurements.
export interface DoseImpact {
  date: string;
  medication: string;
  dose_mg: number | null;
  previous_dose_mg: number | null;
  is_first: boolean;
  slope_before_per_week: number | null;
  slope_after_per_week: number | null;
  n_before: number;
  n_after: number;
  delta_per_week: number | null;
  window_days: number;
  reason: string;
}

export interface Stats {
  total_loss_kg: number;
  avg_loss_per_week: number;
  current_trend: number;
  days_tracked: number;
  measurement_count: number;
  latest_weight: number | null;
}

export interface Mtime {
  mtime: number;
}

export interface ChartParams {
  smoothing: number;
  horizon: number;
  palette: string;
  dark: boolean;
  showExp: boolean;
  showLinear: boolean;
  showBand: boolean;
  // Pure rendering flags (like `palette`/`dark`): toggle the medication-dose
  // markers and the rolling-mean line on the weight chart. Not sent to the
  // backend and deliberately excluded from the chart refresh key so toggling
  // never refetches.
  showDoses: boolean;
  showSmoothed: boolean;
}

// Enum-like constant. The project's tsconfig enables `erasableSyntaxOnly`,
// which disallows TS `enum`/`const enum`; this `as const` object is the
// erasable equivalent (named value + derived union type).
export const WeightUnit = {
  Kg: "kg",
  Lb: "lb",
} as const;
export type WeightUnit = (typeof WeightUnit)[keyof typeof WeightUnit];

// Order of the day/month/year fields in a displayed date. Storage is always
// ISO; this only drives rendering.
export const DateOrder = {
  /** European — 31/12/2026 */
  Dmy: "dmy",
  /** American — 12/31/2026 */
  Mdy: "mdy",
  /** ISO 8601 — 2026-12-31 (always rendered with a dash) */
  Ymd: "ymd",
} as const;
export type DateOrder = (typeof DateOrder)[keyof typeof DateOrder];

export const DateSeparator = {
  Slash: "/",
  Dash: "-",
} as const;
export type DateSeparator = (typeof DateSeparator)[keyof typeof DateSeparator];

export const ModelId = {
  Exp: "exp",
  Linear: "linear",
} as const;
export type ModelId = (typeof ModelId)[keyof typeof ModelId];

export const ZoneKind = {
  Plateau: "plateau",
  Acceleration: "acceleration",
} as const;
export type ZoneKind = (typeof ZoneKind)[keyof typeof ZoneKind];

// ---------------------------------------------------------------------------
// Chart data series (raw numbers — the frontend renders them as custom SVG)
// ---------------------------------------------------------------------------

export interface ChartPoint {
  date: string;
  value: number;
  note: string | null;
}

export interface ChartBandPoint {
  date: string;
  lower: number;
  upper: number;
}

/** Fitted-parameter diagnostics for one prediction model (kg / kg-per-week). */
export interface ModelDiagnostics {
  n_points: number;
  residual_std: number;
  // Exponential decay: w(t) = a·e^(−b·t) + c
  a: number | null;
  b: number | null;
  c: number | null;
  a_std: number | null;
  b_std: number | null;
  c_std: number | null;
  half_life_days: number | null;
  current_rate_per_week: number | null;
  // Theil–Sen linear trend
  slope_per_week: number | null;
  slope_low_per_week: number | null;
  slope_high_per_week: number | null;
  window_days: number | null;
  used_fallback: boolean | null;
}

export interface ModelSeries {
  id: ModelId;
  label: string;
  fit: ChartPoint[];
  projection: ChartPoint[];
  band: ChartBandPoint[];
  asymptote: number | null;
  asymptote_label: string;
  warning: string;
  diagnostics: ModelDiagnostics | null;
}

export interface DeviationZone {
  start: string;
  end: string;
  kind: ZoneKind;
}

export interface WeightChartData {
  raw: ChartPoint[];
  smoothed: ChartPoint[];
  smoothing_window: number;
  models: ModelSeries[];
  zones: DeviationZone[];
  goal_weight: number | null;
}

export interface RatePoint {
  date: string;
  rate: number;
}

export interface DerivativeChartData {
  bars: RatePoint[];
  smoothed: ChartPoint[];
}

export interface ResidualSeries {
  id: ModelId;
  label: string;
  points: ChartPoint[];
}

export interface ResidualsChartData {
  series: ResidualSeries[];
  sigma: number;
}

// Estimated daily energy balance (kcal). Negative = deficit, positive = surplus.
export interface EnergyPoint {
  date: string;
  kcal: number;
}

export interface EnergyChartData {
  bars: EnergyPoint[];
}

export interface EnergyBalance {
  has_data: boolean;
  balance_kcal_day: number | null;
  balance_low: number | null;
  balance_high: number | null;
  window_days: number | null;
  trend_per_week: number | null;
  n_points: number;
  reason: string;
}

// Manual axis-scale overrides. A `null` field means "auto" (derive from data).
export interface DateAxisConfig {
  min: string | null; // ISO date (inclusive lower bound)
  max: string | null; // ISO date (inclusive upper bound)
  stepDays: number | null; // tick spacing in days
}

export interface ValueAxisConfig {
  min: number | null;
  max: number | null;
  step: number | null; // tick spacing in axis units
}

export interface ChartAxes {
  x: DateAxisConfig;
  y: ValueAxisConfig;
}

export const AUTO_AXES: ChartAxes = {
  x: { min: null, max: null, stepDays: null },
  y: { min: null, max: null, step: null },
};

/**
 * The concrete axis values a chart actually renders, once data and any manual
 * overrides are resolved. Used to keep the axis controls populated and in sync
 * with the current state (never blank). `stepDays`/`step` may be null when the
 * axis has fewer than two ticks.
 */
export interface EffectiveAxes {
  x: { min: string; max: string; stepDays: number | null };
  y: { min: number; max: number; step: number | null };
}

export interface UserProfile {
  id: number;
  keycloak_sub: string;
  onboarding_completed: boolean;
  height_cm: number | null;
  goal_weight: number | null;
  target_date: string | null;
  unit_preference: WeightUnit;
  date_order: DateOrder;
  date_separator: DateSeparator;
}

export interface UserProfileUpdate {
  height_cm?: number | null;
  goal_weight?: number | null;
  target_date?: string | null;
  unit_preference?: WeightUnit;
  date_order?: DateOrder;
  date_separator?: DateSeparator;
}

/**
 * Display preferences of a shared dashboard's owner, returned by
 * /api/public/{token}/preferences. The visitor has no account of their own, so
 * the shared page renders with the owner's choices.
 */
export interface DisplayPreferences {
  unit_preference: WeightUnit;
  date_order: DateOrder;
  date_separator: DateSeparator;
}

// Dashboard sharing status returned by /api/me/share.
export interface ShareStatus {
  enabled: boolean;
  token: string | null;
}

export interface GoalProjection {
  has_goal: boolean;
  reachable: boolean | null;
  predicted_date: string | null;
  predicted_date_optimistic: string | null;
  predicted_date_pessimistic: string | null;
  days_remaining: number | null;
  already_reached: boolean;
  on_track: boolean | null;
  days_ahead_behind: number | null;
  trend_per_week: number | null;
  reason: string;
}

export interface Milestone {
  index: number;
  target_weight: number;
  achieved: boolean;
  achieved_date: string | null;
}

export interface NextMilestone {
  index: number;
  target_weight: number;
  kg_remaining: number;
}

export interface MilestonesProjection {
  has_goal: boolean;
  start_weight: number | null;
  goal_weight: number | null;
  milestones: Milestone[];
  current_milestone_index: number;
  percent_complete: number;
  next_milestone: NextMilestone | null;
  remaining_milestones: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Plateau detection
// ---------------------------------------------------------------------------

export const PlateauState = {
  Plateau: "plateau",
  Losing: "losing",
  Gaining: "gaining",
} as const;
export type PlateauState = (typeof PlateauState)[keyof typeof PlateauState];

export interface PlateauZone {
  start: string;
  end: string;
  duration_days: number;
}

export interface PlateauStatus {
  has_data: boolean;
  state: PlateauState | null;
  in_plateau: boolean;
  trend_per_week: number | null;
  since_date: string | null;
  duration_days: number | null;
  history: PlateauZone[];
  avg_duration_days: number | null;
  history_available: boolean;
  reason: string;
  warning: string;
}

// CSV import
export interface CsvPreviewRow {
  date: string;
  weight: number;
}

export interface MedicationCsvPreviewRow {
  date: string;
  medication: string;
  dose_mg: number | null;
  note: string | null;
}

/** Dialect metadata every CSV preview response carries. */
export interface CsvPreviewMeta {
  total_rows: number;
  detected_date_format: string;
  date_format_example: string;
  delimiter: string;
  skipped_rows: number;
}

/** A preview response for a dataset whose rows are `TRow`. */
export type CsvPreviewOf<TRow> = CsvPreviewMeta & { rows: TRow[] };

export type CsvPreview = CsvPreviewOf<CsvPreviewRow>;

export type MedicationCsvPreview = CsvPreviewOf<MedicationCsvPreviewRow>;

/** One column of the CSV import preview table, for a dataset of `TRow`. */
export interface CsvPreviewColumn<TRow> {
  label: string;
  align?: "left" | "right";
  className?: string;
  render: (row: TRow) => string;
}

export interface CsvImportResult {
  inserted: number;
  skipped_duplicates: number;
  skipped_invalid: number;
}
