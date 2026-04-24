/** Typed API client for the Weight Tracker backend.
 *
 * All requests attach a Bearer token retrieved via the registered
 * token getter (set by AuthProvider on mount).  When no getter is
 * registered (e.g. tests) requests are sent without auth headers.
 */

import type {
  ChartParams,
  Measurement,
  MeasurementIn,
  Mtime,
  Palettes,
  Stats,
  UserProfile,
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

// ---------------------------------------------------------------------------
// Stats, palettes, polling
// ---------------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  return fetchJson<Stats>(`${BASE}/stats`);
}

export async function getDbMtime(): Promise<Mtime> {
  return fetchJson<Mtime>(`${BASE}/db-mtime`);
}

export async function getPalettes(): Promise<Palettes> {
  return fetchJson<Palettes>(`${BASE}/palettes`);
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export async function getMe(): Promise<UserProfile> {
  return fetchJson<UserProfile>(`${BASE}/me`);
}

export async function completeOnboarding(): Promise<UserProfile> {
  return fetchJson<UserProfile>(`${BASE}/me/complete-onboarding`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function chartQuery(params: ChartParams): string {
  const q = new URLSearchParams({
    smoothing: String(params.smoothing),
    horizon: String(params.horizon),
    palette: params.palette,
    dark: String(params.dark),
  });
  return q.toString();
}

export async function getWeightChart(params: ChartParams): Promise<object> {
  return fetchJson<object>(`${BASE}/charts/weight?${chartQuery(params)}`);
}

export async function getDerivativeChart(params: ChartParams): Promise<object> {
  return fetchJson<object>(`${BASE}/charts/derivative?${chartQuery(params)}`);
}

export async function getResidualsChart(params: ChartParams): Promise<object> {
  return fetchJson<object>(`${BASE}/charts/residuals?${chartQuery(params)}`);
}

// ---------------------------------------------------------------------------
// Export URLs (opened directly in the browser, token in query param not
// feasible — user must be authenticated when the browser follows the link)
// ---------------------------------------------------------------------------

export function exportPngUrl(params: ChartParams): string {
  return `${BASE}/exports/png?${chartQuery(params)}`;
}

export function exportCsvUrl(): string {
  return `${BASE}/exports/csv`;
}
