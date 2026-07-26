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
  DisplayPreferences,
  DoseImpact,
  EnergyBalance,
  EnergyChartData,
  GoalProjection,
  Measurement,
  MeasurementIn,
  MeasurementUpdate,
  MedicationCsvPreview,
  MedicationCsvPreviewRow,
  MedicationDose,
  MedicationDoseIn,
  MilestonesProjection,
  Mtime,
  PlateauStatus,
  ResidualsChartData,
  ShareStatus,
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

export async function updateMeasurement(
  date: string,
  patch: MeasurementUpdate,
): Promise<Measurement> {
  return fetchJson<Measurement>(`${BASE}/measurements/${date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
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

export async function deleteAllMedicationDoses(): Promise<void> {
  const res = await fetch(`${BASE}/medications`, {
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

export async function getPlateauStatus(): Promise<PlateauStatus> {
  return fetchJson<PlateauStatus>(`${BASE}/stats/plateau`);
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

export async function getGoalMilestones(): Promise<MilestonesProjection> {
  return fetchJson<MilestonesProjection>(`${BASE}/goal/milestones`);
}

// ---------------------------------------------------------------------------
// Energy balance
// ---------------------------------------------------------------------------

export async function getEnergyBalance(): Promise<EnergyBalance> {
  return fetchJson<EnergyBalance>(`${BASE}/stats/energy`);
}

// ---------------------------------------------------------------------------
// Dashboard sharing (authenticated)
// ---------------------------------------------------------------------------

export async function getShareStatus(): Promise<ShareStatus> {
  return fetchJson<ShareStatus>(`${BASE}/me/share`);
}

export async function createShareLink(): Promise<ShareStatus> {
  return fetchJson<ShareStatus>(`${BASE}/me/share`, { method: "POST" });
}

export async function revokeShareLink(): Promise<void> {
  const res = await fetch(`${BASE}/me/share`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
}

// ---------------------------------------------------------------------------
// Public shared dashboard (no auth — token in the path)
// ---------------------------------------------------------------------------
// These deliberately never attach an Authorization header: the endpoints are
// public and the share page renders outside the auth context.

async function fetchPublicJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export async function getPublicStats(token: string): Promise<Stats> {
  return fetchPublicJson<Stats>(`${BASE}/public/${encodeURIComponent(token)}/stats`);
}

/** Display preferences of the share link's owner (unit + date format). */
export async function getPublicPreferences(
  token: string,
): Promise<DisplayPreferences> {
  return fetchPublicJson<DisplayPreferences>(
    `${BASE}/public/${encodeURIComponent(token)}/preferences`,
  );
}

export async function getPublicWeightChart(
  token: string,
  params: ChartParams,
): Promise<WeightChartData> {
  const query = chartQuery(params);
  return fetchPublicJson<WeightChartData>(
    `${BASE}/public/${encodeURIComponent(token)}/charts/weight?${query}`,
  );
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

/** Upload a CSV to a preview endpoint. Multipart, so it bypasses fetchJson. */
async function postCsvFile<TPreview>(path: string, file: File): Promise<TPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
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

function confirmImport<TRow>(
  path: string,
  rows: TRow[],
  dateFormat: string,
): Promise<CsvImportResult> {
  return fetchJson<CsvImportResult>(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, date_format: dateFormat }),
  });
}

export async function previewCsv(file: File): Promise<CsvPreview> {
  return postCsvFile<CsvPreview>("/imports/csv/preview", file);
}

export async function confirmCsvImport(
  rows: CsvPreviewRow[],
  dateFormat: string,
): Promise<CsvImportResult> {
  return confirmImport("/imports/csv/confirm", rows, dateFormat);
}

export async function previewMedicationCsv(
  file: File,
): Promise<MedicationCsvPreview> {
  return postCsvFile<MedicationCsvPreview>(
    "/imports/medications/csv/preview",
    file,
  );
}

export async function confirmMedicationCsvImport(
  rows: MedicationCsvPreviewRow[],
  dateFormat: string,
): Promise<CsvImportResult> {
  return confirmImport("/imports/medications/csv/confirm", rows, dateFormat);
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

export async function getEnergyChart(params: ChartParams): Promise<EnergyChartData> {
  return fetchJson<EnergyChartData>(`${BASE}/charts/energy?${chartQuery(params)}`);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
// A plain <a href> link cannot carry the Bearer token, so the request must go
// through the authenticated fetch client and download the response as a blob.

async function fetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.blob();
}

export async function exportCsv(): Promise<Blob> {
  return fetchBlob("/exports/csv");
}

export async function exportMedicationsCsv(): Promise<Blob> {
  return fetchBlob("/exports/medications/csv");
}
