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
}

export interface UserProfile {
  id: number;
  keycloak_sub: string;
  onboarding_completed: boolean;
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
