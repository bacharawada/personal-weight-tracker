/**
 * Global app state shared across all pages.
 *
 * Provides chart configuration, refresh/polling state, selected
 * point for deletion, and the theme toggle — all accessible from
 * any page without prop drilling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getMe, getMeasurements, updateProfile } from "../lib/api";
import { getPaletteAccent } from "../lib/palette";
import type { ChartParams, UserProfile, UserProfileUpdate } from "../lib/types";
import { WeightUnit } from "../lib/types";
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

  // User profile (height, goal, units)
  profile: UserProfile | null;
  unit: WeightUnit;
  saveProfile: (patch: UserProfileUpdate) => Promise<void>;

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
    showExp: true,
    showLinear: false,
    showBand: true,
  });

  const [hasData, setHasData] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

  // Skip the dark-sync effect on the very first render: chartParams is already
  // initialised with the correct isDark value above. Running it on mount would
  // create a new chartParams object reference (even with identical values),
  // changing chartRefreshKey and triggering spurious data fetches.
  const darkSyncIsFirstRender = useRef(true);
  useEffect(() => {
    if (darkSyncIsFirstRender.current) {
      darkSyncIsFirstRender.current = false;
      console.log("[WTC] dark-sync skipped on mount (isDark=%s)", isDark);
      return;
    }
    console.log("[WTC] dark changed →", isDark, "— updating chartParams");
    setChartParams((prev) => ({ ...prev, dark: isDark }));
  }, [isDark]);

  // Check if any data exists (used to enable/disable exports).
  useEffect(() => {
    getMeasurements()
      .then((m) => setHasData(m.length > 0))
      .catch(() => setHasData(false));
  }, [refreshKey]);

  // Load the user profile (height, goal, unit preference).
  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [refreshKey]);

  const saveProfile = useCallback(
    async (patch: UserProfileUpdate) => {
      const updated = await updateProfile(patch);
      setProfile(updated);
      // Bump so the weight chart (which draws the goal line server-side
      // from the profile) and the goal card refetch.
      bump();
    },
    [bump],
  );

  const unit = profile?.unit_preference ?? WeightUnit.Kg;

  // Stable numeric key from refreshKey + chartParams for chart refetches.
  const chartRefreshKey = useMemo(() => {
    const str = `${refreshKey}-${JSON.stringify(chartParams)}`;
    let hash = 0;
    for (const ch of str) {
      hash = (hash << 5) - hash + ch.charCodeAt(0);
      hash |= 0;
    }
    const key = Math.abs(hash);
    console.log("[WTC] chartRefreshKey recomputed →", key, "| refreshKey=", refreshKey, "| params=", JSON.stringify(chartParams));
    return key;
  }, [refreshKey, chartParams]);

  const accent = useMemo(
    () => getPaletteAccent(chartParams.palette),
    [chartParams.palette]
  );

  // Keep the --color-accent CSS variable on <html> in sync with the chosen palette.
  // This lets Tailwind's `bg-[var(--color-accent)]` and Button variant="primary"
  // pick up the user's palette choice without per-component inline styles.
  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accent);
  }, [accent]);

  const value = useMemo<WeightTrackerContextValue>(
    () => ({
      isDark,
      toggleTheme: toggle,
      // chartParams already has dark kept in sync via the useEffect above —
      // do NOT spread a new object here, that creates a new reference every
      // render and triggers unnecessary chart re-fetches.
      chartParams,
      setChartParams,
      accent,
      refreshKey: chartRefreshKey,
      bump,
      hasData,
      profile,
      unit,
      saveProfile,
      selectedPoint,
      setSelectedPoint,
    }),
    [
      isDark,
      toggle,
      chartParams,
      accent,
      chartRefreshKey,
      bump,
      hasData,
      profile,
      unit,
      saveProfile,
      selectedPoint,
    ]
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
