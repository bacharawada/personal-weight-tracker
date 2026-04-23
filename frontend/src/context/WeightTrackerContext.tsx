/**
 * Global app state shared across all pages.
 *
 * Provides chart configuration, refresh/polling state, selected
 * point for deletion, and the theme toggle — all accessible from
 * any page without prop drilling.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMeasurements } from "../lib/api";
import { getPaletteAccent } from "../lib/palette";
import type { ChartParams } from "../lib/types";
import { usePolling } from "../hooks/usePolling";
import { useTheme } from "../hooks/useTheme";

interface SelectedPoint {
  date: string;
  weight: number;
}

interface WeightTrackerContextValue {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Chart configuration
  chartParams: ChartParams;
  setChartParams: (params: ChartParams) => void;

  // Active palette accent color (hex) derived from chartParams.palette
  accent: string;

  // Data refresh
  refreshKey: number;
  bump: () => void;

  // Dataset state
  hasData: boolean;

  // Point selection (for deletion)
  selectedPoint: SelectedPoint | null;
  setSelectedPoint: (point: SelectedPoint | null) => void;
}

export const WeightTrackerContext = createContext<WeightTrackerContextValue | null>(null);

export function WeightTrackerProvider({ children }: { children: React.ReactNode }) {
  const { isDark, toggle } = useTheme();
  const { refreshKey, bump } = usePolling();

  const [chartParams, setChartParams] = useState<ChartParams>({
    smoothing: 5,
    horizon: 56,
    palette: "Classic",
    dark: isDark,
  });

  const [hasData, setHasData] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

  // Keep dark param in sync with theme.
  useEffect(() => {
    setChartParams((prev) => ({ ...prev, dark: isDark }));
  }, [isDark]);

  // Check if any data exists (used to enable/disable exports).
  useEffect(() => {
    getMeasurements()
      .then((m) => setHasData(m.length > 0))
      .catch(() => setHasData(false));
  }, [refreshKey]);

  // Stable numeric key from refreshKey + chartParams for chart refetches.
  const chartRefreshKey = useMemo(() => {
    const str = `${refreshKey}-${JSON.stringify(chartParams)}`;
    let hash = 0;
    for (const ch of str) {
      hash = (hash << 5) - hash + ch.charCodeAt(0);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [refreshKey, chartParams]);

  const accent = useMemo(
    () => getPaletteAccent(chartParams.palette),
    [chartParams.palette]
  );

  const value = useMemo<WeightTrackerContextValue>(
    () => ({
      isDark,
      toggleTheme: toggle,
      chartParams: { ...chartParams, dark: isDark },
      setChartParams,
      accent,
      refreshKey: chartRefreshKey,
      bump,
      hasData,
      selectedPoint,
      setSelectedPoint,
    }),
    [isDark, toggle, chartParams, accent, chartRefreshKey, bump, hasData, selectedPoint]
  );

  return (
    <WeightTrackerContext.Provider value={value}>
      {children}
    </WeightTrackerContext.Provider>
  );
}

export function useWeightTracker(): WeightTrackerContextValue {
  const ctx = useContext(WeightTrackerContext);
  if (!ctx) throw new Error("useWeightTracker must be used inside WeightTrackerProvider");
  return ctx;
}
