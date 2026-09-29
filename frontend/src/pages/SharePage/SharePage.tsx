/**
 * Public shared-dashboard page (`/share/:token`).
 *
 * Renders a read-only take on the analysis page's weight chart — the owner's
 * trajectory, the model headline numbers and the chart itself, with light
 * controls (quick ranges, series) for the visitor — for whoever owns the share
 * token. It lives entirely outside the auth context and the app shell: it
 * fetches the token-scoped public endpoints directly, manages its own
 * light/dark theme, and offers an in-page language switch. An invalid or
 * revoked token shows a clean "link unavailable" message.
 *
 * The visitor has no account, so weights and dates render with the *owner's*
 * display preferences, served through `DisplayPreferencesProvider`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import {
  getPublicPreferences,
  getPublicStats,
  getPublicWeightChart,
} from "../../lib/api";
import {
  DEFAULT_CHART_CONTROLS,
  type ChartAxes,
  type ChartParams,
  type DisplayPreferences,
  type Stats,
  type WeightChartData,
} from "../../lib/types";
import { WeightChart } from "../../components/charts/WeightChart";
import { ModelStatsStrip } from "../../components/charts/ModelStatsStrip";
import { Spinner } from "../../components/ui/Spinner";
import { DisplayPreferencesProvider } from "../../context/DisplayPreferencesContext";
import { DEFAULT_DISPLAY_PREFERENCES } from "../../lib/dates";
import { WEIGHT_AXES_DEFAULT } from "../../lib/charts/rangePreset";
import { defaultChartHeight } from "../../lib/charts/chartHeight";
import { unitLabel } from "../../lib/units";
import { useTheme } from "../../hooks/useTheme";
import { ShareHeader } from "./ShareHeader";
import { ShareTrajectory } from "./ShareTrajectory";
import { ShareChartControls } from "./ShareChartControls";

type PageState = "loading" | "valid" | "invalid";

/** The series the visitor may toggle; the rest of `ChartParams` stays fixed. */
type SeriesParams = Pick<ChartParams, "showSmoothed" | "showExp" | "showLinear" | "showBand">;

const DEFAULT_SERIES: SeriesParams = {
  showSmoothed: DEFAULT_CHART_CONTROLS.showSmoothed,
  showExp: DEFAULT_CHART_CONTROLS.showExp,
  showLinear: DEFAULT_CHART_CONTROLS.showLinear,
  showBand: DEFAULT_CHART_CONTROLS.showBand,
};

const NOOP = () => {};

export function SharePage() {
  const { token } = useParams();
  const { t } = useTranslation("share");
  const { t: tAnalysis } = useTranslation("analysis");
  const { isDark, toggle } = useTheme();

  const hasToken = token != null && token.length > 0;

  // Seed the state from the URL synchronously so the effect never has to call
  // setState in its body (only inside async callbacks).
  const [pageState, setPageState] = useState<PageState>(
    hasToken ? "loading" : "invalid",
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [preferences, setPreferences] = useState<DisplayPreferences>(
    DEFAULT_DISPLAY_PREFERENCES,
  );
  const [series, setSeries] = useState<SeriesParams>(DEFAULT_SERIES);
  const [axes, setAxes] = useState<ChartAxes>(WEIGHT_AXES_DEFAULT);
  const [chartHeight] = useState<number>(defaultChartHeight);
  const [weightData, setWeightData] = useState<WeightChartData | null>(null);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    getPublicStats(token)
      .then((result) => {
        if (!cancelled) {
          setStats(result);
          setPageState("valid");
        }
      })
      .catch(() => {
        if (!cancelled) setPageState("invalid");
      });
    // Preferences are cosmetic: a failure here leaves the defaults in place
    // rather than breaking an otherwise valid link.
    getPublicPreferences(token)
      .then((result) => {
        if (!cancelled) setPreferences(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, hasToken]);

  // Smoothing and horizon stay on the analysis defaults; dose markers are never
  // shared, the medication journal being health data.
  const params: ChartParams = useMemo(
    () => ({
      smoothing: DEFAULT_CHART_CONTROLS.smoothing,
      horizon: DEFAULT_CHART_CONTROLS.horizon,
      palette: "Classic",
      dark: isDark,
      showDoses: false,
      ...series,
    }),
    [isDark, series],
  );

  const handleParamsChange = useCallback(
    (next: ChartParams) =>
      setSeries({
        showSmoothed: next.showSmoothed,
        showExp: next.showExp,
        showLinear: next.showLinear,
        showBand: next.showBand,
      }),
    [],
  );

  const chartFetcher = useCallback(
    () => getPublicWeightChart(token ?? "", params),
    [token, params],
  );

  const unitSuffix = unitLabel(preferences.unit_preference);
  const points = weightData?.raw ?? [];

  return (
    <DisplayPreferencesProvider preferences={preferences}>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <ShareHeader isDark={isDark} onToggleTheme={toggle} />

        {pageState === "loading" && (
          <div className="flex items-center justify-center py-24">
            <Spinner size={36} />
          </div>
        )}

        {pageState === "invalid" && (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{t("invalidTitle")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {t("invalidBody")}
            </p>
          </div>
        )}

        {pageState === "valid" && stats != null && (
          <div className="space-y-4 md:space-y-6">
            <ShareTrajectory points={points} stats={stats} />

            <ShareChartControls
              params={params}
              onParamsChange={handleParamsChange}
              axes={axes}
              onAxesChange={setAxes}
              points={points}
            />

            <ModelStatsStrip
              models={weightData?.models ?? []}
              unit={preferences.unit_preference}
            />

            {/* The height lives on a wrapper, not the card: it is a runtime pixel
                value resolved from the viewport, which Tailwind cannot express. */}
            <div style={{ height: chartHeight }}>
              <WeightChart
                params={params}
                refreshKey={0}
                onPointClick={NOOP}
                fetcher={chartFetcher}
                axes={axes}
                className="h-full"
                title={tAnalysis("chartTitles.weight", { unit: unitSuffix })}
                onDataLoaded={setWeightData}
              />
            </div>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600">
          {t("poweredBy", { app: "Weight Tracker" })}
        </footer>
      </div>
    </div>
    </DisplayPreferencesProvider>
  );
}
