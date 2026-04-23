/** Typed API client for the Weight Tracker backend. */

import type {
  ChartParams,
  Measurement,
  MeasurementIn,
  Mtime,
  Palettes,
  Stats,
} from "./types";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

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

export async function deleteMeasurement(date: string): Promise<void> {
  const res = await fetch(`${BASE}/measurements/${date}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
}

export async function getStats(): Promise<Stats> {
  return fetchJson<Stats>(`${BASE}/stats`);
}

export async function getDbMtime(): Promise<Mtime> {
  return fetchJson<Mtime>(`${BASE}/db-mtime`);
}

export async function getPalettes(): Promise<Palettes> {
  return fetchJson<Palettes>(`${BASE}/palettes`);
}

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

export function exportPngUrl(params: ChartParams): string {
  return `${BASE}/exports/png?${chartQuery(params)}`;
}

export function exportCsvUrl(): string {
  return `${BASE}/exports/csv`;
}
