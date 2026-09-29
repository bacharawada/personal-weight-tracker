import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { computeDeltas } from "../../lib/dashboard/series";
import { formatWeight } from "../../lib/units";
import type { ChartPoint, Measurement, Stats } from "../../lib/types";
import { DeltaStat } from "../../components/dashboard/TrajectoryPanel";
import { Tile } from "../../components/dashboard/tiles";

interface ShareTrajectoryProps {
  /** Raw measurements from the public chart payload; empty until it loads. */
  points: ChartPoint[];
  stats: Stats;
}

/**
 * The share page's headline: current weight and how it moved, as on the
 * dashboard's trajectory panel.
 *
 * Everything is derived from the chart payload the page already fetched, so
 * the visitor sees nothing the owner's chart does not already show.
 */
export function ShareTrajectory({ points, stats }: ShareTrajectoryProps) {
  const { t } = useTranslation("share");
  const { t: tDashboard } = useTranslation("dashboard");
  const { unit, formatDate } = useDisplayPreferences();

  const measurements = useMemo<Measurement[]>(
    () =>
      points
        .map((point) => ({ date: point.date, weight: point.value, note: null }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [points],
  );
  const deltas = computeDeltas(measurements);
  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  return (
    <Tile
      label={tDashboard("trajectory.currentWeight")}
      action={
        latest && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(latest.date)}
          </span>
        )
      }
    >
      {latest ? (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mt-1">
          <div>
            <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-none">
              {formatWeight(latest.weight, unit)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t("daysTracked", { count: stats.days_tracked })}
              {" · "}
              {t("measurementCount", { count: stats.measurement_count })}
            </p>
          </div>
          <div className="flex gap-5 md:gap-8">
            <DeltaStat label={tDashboard("trajectory.last7Days")} valueKg={deltas.last7Days} />
            <DeltaStat label={tDashboard("trajectory.last30Days")} valueKg={deltas.last30Days} />
            <DeltaStat label={tDashboard("trajectory.sinceStart")} valueKg={deltas.total} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {tDashboard("trajectory.noWeight")}
        </p>
      )}
    </Tile>
  );
}
