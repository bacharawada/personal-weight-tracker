/** TypeScript types matching the FastAPI Pydantic schemas. */

export interface Measurement {
  date: string;
  weight: number;
}

export interface MeasurementIn {
  date: string;
  weight: number;
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

export interface Palettes {
  names: string[];
}

export interface ChartParams {
  smoothing: number;
  horizon: number;
  palette: string;
  dark: boolean;
  showExp: boolean;
  showLinear: boolean;
  showBand: boolean;
}

// Enum-like constant. The project's tsconfig enables `erasableSyntaxOnly`,
// which disallows TS `enum`/`const enum`; this `as const` object is the
// erasable equivalent (named value + derived union type).
export const WeightUnit = {
  Kg: "kg",
  Lb: "lb",
} as const;
export type WeightUnit = (typeof WeightUnit)[keyof typeof WeightUnit];

export interface UserProfile {
  id: number;
  keycloak_sub: string;
  onboarding_completed: boolean;
  height_cm: number | null;
  goal_weight: number | null;
  target_date: string | null;
  unit_preference: WeightUnit;
}

export interface UserProfileUpdate {
  height_cm?: number | null;
  goal_weight?: number | null;
  target_date?: string | null;
  unit_preference?: WeightUnit;
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

// CSV import
export interface CsvPreviewRow {
  date: string;
  weight: number;
}

export interface CsvPreview {
  rows: CsvPreviewRow[];
  total_rows: number;
  detected_date_format: string;
  date_format_example: string;
  delimiter: string;
  skipped_rows: number;
}

export interface CsvImportResult {
  inserted: number;
  skipped_duplicates: number;
  skipped_invalid: number;
}
