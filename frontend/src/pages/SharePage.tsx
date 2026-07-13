/**
 * Public shared-dashboard page (`/share/:token`).
 *
 * Renders a read-only weight chart plus summary stats for whoever owns the
 * share token. It lives entirely outside the auth context and the app shell:
 * it fetches the token-scoped public endpoints directly, manages its own
 * light/dark theme, and offers an in-page language switch. An invalid or
 * revoked token shows a clean "link unavailable" message.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Globe, Moon, Scale, Sun } from "lucide-react";
import { getPublicStats, getPublicWeightChart } from "../lib/api";
import type { ChartParams, Stats } from "../lib/types";
import { WeightChart } from "../components/charts/WeightChart";
import { Spinner } from "../components/ui/Spinner";
import { useTheme } from "../hooks/useTheme";

type PageState = "loading" | "valid" | "invalid";

const NOOP = () => {};

export function SharePage() {
  const { token } = useParams();
  const { t, i18n } = useTranslation("share");
  const { isDark, toggle } = useTheme();

  const hasToken = token != null && token.length > 0;

  // Seed the state from the URL synchronously so the effect never has to call
  // setState in its body (only inside async callbacks).
  const [pageState, setPageState] = useState<PageState>(
    hasToken ? "loading" : "invalid",
  );
  const [stats, setStats] = useState<Stats | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [token, hasToken]);

  const params: ChartParams = useMemo(
    () => ({
      smoothing: 5,
      horizon: 56,
      palette: "Classic",
      dark: isDark,
      showExp: true,
      showLinear: false,
      showBand: true,
    }),
    [isDark],
  );

  const chartFetcher = useCallback(
    () => getPublicWeightChart(token ?? "", params),
    [token, params],
  );

  const currentLanguage = i18n.language.startsWith("fr") ? "fr" : "en";
  const nextLanguage = currentLanguage === "fr" ? "en" : "fr";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 shrink-0">
              <Scale className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                  {t("title")}
                </h1>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {t("badge")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggle}
              aria-label={t("toggleTheme")}
              title={t("toggleTheme")}
              className="p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => void i18n.changeLanguage(nextLanguage)}
              aria-label={t("toggleLanguage")}
              title={t("toggleLanguage")}
              className="flex items-center gap-1.5 p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
            >
              <Globe size={18} />
              <span className="text-xs font-medium uppercase">{nextLanguage}</span>
            </button>
          </div>
        </header>

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

        {pageState === "valid" && (
          <div className="space-y-6">
            {/* Summary stats */}
            {stats != null && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {t("statsHeading")}
                </h2>
                <PublicStats stats={stats} />
              </section>
            )}

            {/* Weight chart */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {t("chartHeading")}
              </h2>
              <WeightChart
                params={params}
                refreshKey={0}
                onPointClick={NOOP}
                fetcher={chartFetcher}
                className="h-[340px] sm:h-[440px]"
              />
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600">
          {t("poweredBy", { app: "Weight Tracker" })}
        </footer>
      </div>
    </div>
  );
}

interface PublicStatsProps {
  stats: Stats;
}

/** Read-only stat tiles for the shared dashboard (values shown in kg). */
function PublicStats({ stats }: PublicStatsProps) {
  // Stat labels are shared with the authenticated dashboard.
  const { t: label } = useTranslation("dashboard");
  const trendColor =
    stats.current_trend === 0
      ? "text-gray-500"
      : stats.current_trend < -0.1
        ? "text-green-600"
        : stats.current_trend > 0.1
          ? "text-red-600"
          : "text-gray-500";

  const tiles = [
    {
      label: label("stats.totalLoss"),
      value: `${stats.total_loss_kg > 0 ? "-" : "+"}${Math.abs(stats.total_loss_kg).toFixed(1)} kg`,
      color: stats.total_loss_kg > 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: label("stats.avgLossPerWeek"),
      value: `${stats.avg_loss_per_week >= 0 ? "+" : ""}${stats.avg_loss_per_week.toFixed(2)} kg/wk`,
      color: "text-gray-900 dark:text-gray-100",
    },
    {
      label: label("stats.currentTrend"),
      value: `${stats.current_trend >= 0 ? "+" : ""}${stats.current_trend.toFixed(2)} kg/wk`,
      color: trendColor,
    },
    {
      label: label("stats.daysTracked"),
      value: String(stats.days_tracked),
      color: "text-gray-900 dark:text-gray-100",
    },
    {
      label: label("stats.measurements"),
      value: String(stats.measurement_count),
      color: "text-gray-900 dark:text-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center h-20 flex flex-col justify-center"
        >
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-tight">
            {tile.label}
          </p>
          <p className={`text-base md:text-xl font-bold leading-tight mt-0.5 ${tile.color}`}>
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
