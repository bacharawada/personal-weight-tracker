/** Typed API client for the Weight Tracker backend.
 *
 * All requests attach a Bearer token retrieved via the registered
 * token getter (set by AuthProvider on mount).  When no getter is
 * registered (e.g. tests) requests are sent without auth headers.
 */

import type {
  ChartParams,
  CsvImportResult,
  CsvPreview,
  CsvPreviewRow,
  DerivativeChartData,
  DoseImpact,
  GoalProjection,
  Measurement,
  MeasurementIn,
  MedicationDose,
  MedicationDoseIn,
  Mtime,
  ResidualsChartData,
  Stats,
  UserProfile,
  UserProfileUpdate,
  WeightChartData,
} from "./types";

const BASE = "/api";

// ---------------------------------------------------------------------------
// Auth token injection
// ---------------------------------------------------------------------------
// AuthProvider calls setTokenGetter() on mount so every fetch gets the
// latest access token without coupling this module to React.

type TokenGetter = () => string | null;
let _tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter): void {
  _tokenGetter = getter;
}

function authHeaders(): Record<string, string> {
  const token = _tokenGetter?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

export async function getMeasurements(): Promise<Measurement[]> {
  return fetchJson<Measurement[]>(`${BASE}/measurements`);
}

export async function addMeasurement(data: MeasurementIn): Promise<Measurement> {
  return fetchJson<Measurement>(`${BASE}/measurements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateMeasurement(date: string, weight: number): Promise<Measurement> {
  return fetchJson<Measurement>(`${BASE}/measurements/${date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight }),
  });
}

export async function deleteMeasurement(date: string): Promise<void> {
  const res = await fetch(`${BASE}/measurements/${date}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
}

export async function deleteAllMeasurements(): Promise<void> {
  const res = await fetch(`${BASE}/measurements`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
}

// ---------------------------------------------------------------------------
// Medication doses
// ---------------------------------------------------------------------------

export async function getMedications(): Promise<MedicationDose[]> {
  return fetchJson<MedicationDose[]>(`${BASE}/medications`);
}

export async function addMedicationDose(
  data: MedicationDoseIn,
): Promise<MedicationDose> {
  return fetchJson<MedicationDose>(`${BASE}/medications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteMedicationDose(id: number): Promise<void> {
  const res = await fetch(`${BASE}/medications/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
}

export async function getMedicationImpact(): Promise<DoseImpact[]> {
  return fetchJson<DoseImpact[]>(`${BASE}/medications/impact`);
}

// ---------------------------------------------------------------------------
// Stats, palettes, polling
// ---------------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  return fetchJson<Stats>(`${BASE}/stats`);
}

export async function getDbMtime(): Promise<Mtime> {
  return fetchJson<Mtime>(`${BASE}/db-mtime`);
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export async function getMe(): Promise<UserProfile> {
  return fetchJson<UserProfile>(`${BASE}/me`);
}

export async function updateProfile(patch: UserProfileUpdate): Promise<UserProfile> {
  return fetchJson<UserProfile>(`${BASE}/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function completeOnboarding(): Promise<UserProfile> {
  return fetchJson<UserProfile>(`${BASE}/me/complete-onboarding`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Goal projection
// ---------------------------------------------------------------------------

export async function getGoal(): Promise<GoalProjection> {
  return fetchJson<GoalProjection>(`${BASE}/goal`);
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export async function previewCsv(file: File): Promise<CsvPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/imports/csv/preview`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export async function confirmCsvImport(
  rows: CsvPreviewRow[],
  dateFormat: string,
): Promise<CsvImportResult> {
  return fetchJson<CsvImportResult>(`${BASE}/imports/csv/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, date_format: dateFormat }),
  });
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

// Only data-affecting params reach the backend. Colour palette and theme are
// pure rendering concerns handled entirely on the frontend.
function chartQuery(params: ChartParams): string {
  const models = [
    ...(params.showExp ? ["exp"] : []),
    ...(params.showLinear ? ["linear"] : []),
  ].join(",");
  const q = new URLSearchParams({
    smoothing: String(params.smoothing),
    horizon: String(params.horizon),
    models,
    band: String(params.showBand),
  });
  return q.toString();
}

export async function getWeightChart(params: ChartParams): Promise<WeightChartData> {
  return fetchJson<WeightChartData>(`${BASE}/charts/weight?${chartQuery(params)}`);
}

export async function getDerivativeChart(params: ChartParams): Promise<DerivativeChartData> {
  return fetchJson<DerivativeChartData>(`${BASE}/charts/derivative?${chartQuery(params)}`);
}

export async function getResidualsChart(params: ChartParams): Promise<ResidualsChartData> {
  return fetchJson<ResidualsChartData>(`${BASE}/charts/residuals?${chartQuery(params)}`);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
// A plain <a href> link cannot carry the Bearer token, so the request must go
// through the authenticated fetch client and download the response as a blob.

export async function exportCsv(): Promise<Blob> {
  const res = await fetch(`${BASE}/exports/csv`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.blob();
}
