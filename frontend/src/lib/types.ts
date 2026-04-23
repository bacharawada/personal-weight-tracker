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
