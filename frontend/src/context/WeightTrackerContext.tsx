/**
 * Global app state shared across all pages.
 *
 * Provides chart configuration, refresh/polling state, selected
 * point for deletion, and the theme toggle — all accessible from
 * any page without prop drilling.
 *
 * Appearance preferences (theme, palette, language) are owned by the server so
 * they follow the account across devices. Because theme and language must be
 * right on the very first paint — long before `/api/me` resolves — the browser
 * keeps a local copy (localStorage for the theme, i18next's own store for the
 * language) and this provider reconciles the two once the profile arrives, then
 * persists every later change.
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
import { DEFAULT_DISPLAY_PREFERENCES } from "../lib/dates";
import { getPaletteAccent } from "../lib/palettes";
import type {
  ChartParams,
  DisplayPreferences,
  UserProfile,
  UserProfileUpdate,
} from "../lib/types";
import { DEFAULT_CHART_CONTROLS, Theme, WeightUnit } from "../lib/types";
import i18n from "../i18n";
import { isLanguage } from "../i18n/config";
import { usePolling } from "../hooks/usePolling";
import { useTheme } from "../hooks/useTheme";
import { DisplayPreferencesProvider } from "./DisplayPreferencesContext";

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
  /** Persist profile data and refetch — for height, goal weight, target date. */
  saveProfile: (patch: UserProfileUpdate) => Promise<void>;
  /** Persist a rendering preference without triggering a chart refetch. */
  savePreference: (patch: UserProfileUpdate) => Promise<void>;

  // Point selection (for deletion)
  selectedPoint: SelectedPoint | null;
  setSelectedPoint: (point: SelectedPoint | null) => void;
}

export const WeightTrackerContext = createContext<WeightTrackerContextValue | null>(null);

export function WeightTrackerProvider({ children }: { children: React.ReactNode }) {
  const { isDark, setTheme } = useTheme();
  const { refreshKey, bump } = usePolling();

  const [chartParams, setChartParams] = useState<ChartParams>({
    ...DEFAULT_CHART_CONTROLS,
    palette: "Classic",
    dark: isDark,
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

  const savePreference = useCallback(async (patch: UserProfileUpdate) => {
    const updated = await updateProfile(patch);
    setProfile(updated);
    // Deliberately no bump(): units, date format, theme, palette and language
    // are pure rendering concerns. The server returns the same numbers either
    // way, so refetching every chart would be wasted work.
  }, []);

  // Adopt the server's appearance once per user rather than on every profile
  // write: a later PATCH response must not clobber a change made in between.
  const appearanceSyncedFor = useRef<number | null>(null);
  useEffect(() => {
    if (profile == null || appearanceSyncedFor.current === profile.id) return;
    appearanceSyncedFor.current = profile.id;

    setTheme(profile.theme);
    setChartParams((prev) =>
      prev.palette === profile.palette ? prev : { ...prev, palette: profile.palette },
    );
    // A null language means the user never picked one — keep whatever the
    // browser detected instead of forcing a default on them.
    if (profile.language != null && profile.language !== i18n.language) {
      void i18n.changeLanguage(profile.language);
    }
  }, [profile, setTheme]);

  // Persist any language switch, wherever in the UI it was triggered.
  useEffect(() => {
    function handleLanguageChanged(language: string) {
      if (!isLanguage(language)) return;
      // Skip the echo of the reconciliation above, and the initial detection
      // for a user whose profile has not loaded yet.
      if (profile == null || profile.language === language) return;
      void savePreference({ language });
    }
    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [profile, savePreference]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? Theme.Light : Theme.Dark;
    setTheme(next);
    void savePreference({ theme: next });
  }, [isDark, setTheme, savePreference]);

  // Palette lives in chartParams for the charts' benefit, but it is a stored
  // preference — persist it whenever it actually changes.
  const applyChartParams = useCallback(
    (next: ChartParams) => {
      setChartParams(next);
      if (next.palette !== chartParams.palette) {
        void savePreference({ palette: next.palette });
      }
    },
    [chartParams.palette, savePreference],
  );

  const unit = profile?.unit_preference ?? WeightUnit.Kg;

  // Display preferences are served through their own provider so the charts can
  // read them on the public share page too, where this provider is absent.
  const displayPreferences = useMemo<DisplayPreferences>(
    () =>
      profile == null
        ? DEFAULT_DISPLAY_PREFERENCES
        : {
            unit_preference: profile.unit_preference,
            date_order: profile.date_order,
            date_separator: profile.date_separator,
          },
    [profile],
  );

  // Stable numeric key from refreshKey + the data-affecting chart params only.
  // Palette and dark mode are pure rendering concerns handled client-side, so
  // they are deliberately excluded — changing them re-renders without a refetch.
  const chartRefreshKey = useMemo(() => {
    const str = [
      refreshKey,
      chartParams.smoothing,
      chartParams.horizon,
      chartParams.showExp,
      chartParams.showLinear,
      chartParams.showBand,
    ].join("-");
    let hash = 0;
    for (const ch of str) {
      hash = (hash << 5) - hash + ch.charCodeAt(0);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [
    refreshKey,
    chartParams.smoothing,
    chartParams.horizon,
    chartParams.showExp,
    chartParams.showLinear,
    chartParams.showBand,
  ]);

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
      toggleTheme,
      // chartParams already has dark kept in sync via the useEffect above —
      // do NOT spread a new object here, that creates a new reference every
      // render and triggers unnecessary chart re-fetches.
      chartParams,
      setChartParams: applyChartParams,
      accent,
      refreshKey: chartRefreshKey,
      bump,
      hasData,
      profile,
      unit,
      saveProfile,
      savePreference,
      selectedPoint,
      setSelectedPoint,
    }),
    [
      isDark,
      toggleTheme,
      chartParams,
      applyChartParams,
      accent,
      chartRefreshKey,
      bump,
      hasData,
      profile,
      unit,
      saveProfile,
      savePreference,
      selectedPoint,
    ]
  );

  return (
    <WeightTrackerContext.Provider value={value}>
      <DisplayPreferencesProvider preferences={displayPreferences}>
        {children}
      </DisplayPreferencesProvider>
    </WeightTrackerContext.Provider>
  );
}

export function useWeightTracker(): WeightTrackerContextValue {
  const ctx = useContext(WeightTrackerContext);
  if (!ctx) throw new Error("useWeightTracker must be used inside WeightTrackerProvider");
  return ctx;
}
