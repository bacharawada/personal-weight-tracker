import { useTranslation } from "react-i18next";
import { kgToDisplay, unitLabel } from "../../lib/units";
import { ModelId, type ModelSeries, type WeightUnit } from "../../lib/types";

interface ModelStatsStripProps {
  models: ModelSeries[];
  unit: WeightUnit;
}

interface StatEntry {
  label: string;
  value: string;
  detail: string;
}

/** Headline numbers from the fitted prediction models, shown above the charts. */
export function ModelStatsStrip({ models, unit }: ModelStatsStripProps) {
  const { t } = useTranslation("analysis");
  const u = unitLabel(unit);
  const expDiag = models.find((m) => m.id === ModelId.Exp)?.diagnostics ?? null;
  const linDiag = models.find((m) => m.id === ModelId.Linear)?.diagnostics ?? null;

  const stats: StatEntry[] = [];

  if (expDiag?.c != null) {
    stats.push({
      label: t("stats.predictedEquilibrium"),
      value: `${kgToDisplay(expDiag.c, unit).toFixed(1)} ${u}`,
      detail:
        expDiag.c_std != null
          ? `± ${kgToDisplay(expDiag.c_std, unit).toFixed(1)} ${u}`
          : t("stats.equilibriumAsymptote"),
    });
  }
  if (expDiag?.half_life_days != null) {
    stats.push({
      label: t("stats.halfLife"),
      value: t("stats.halfLifeDays", { days: Math.round(expDiag.half_life_days) }),
      detail: t("stats.halfLifeDetail"),
    });
  }
  if (expDiag?.current_rate_per_week != null) {
    stats.push({
      label: t("stats.modelRateToday"),
      value: t("stats.modelRateValue", {
        rate: kgToDisplay(expDiag.current_rate_per_week, unit).toFixed(2),
        unit: u,
      }),
      detail: t("stats.modelRateDetail"),
    });
  }
  if (linDiag?.slope_per_week != null) {
    stats.push({
      label: t("stats.recentTrend"),
      value: t("stats.recentTrendValue", {
        slope: kgToDisplay(linDiag.slope_per_week, unit).toFixed(2),
        unit: u,
      }),
      detail:
        linDiag.slope_low_per_week != null && linDiag.slope_high_per_week != null
          ? t("stats.recentTrendCi", {
              low: kgToDisplay(linDiag.slope_low_per_week, unit).toFixed(2),
              high: kgToDisplay(linDiag.slope_high_per_week, unit).toFixed(2),
            })
          : t("stats.recentTrendTheilSen", { count: linDiag.n_points }),
    });
  }
  if (expDiag != null && expDiag.residual_std > 0) {
    stats.push({
      label: t("stats.fitScatter"),
      value: `${kgToDisplay(expDiag.residual_std, unit).toFixed(2)} ${u}`,
      detail: t("stats.fitScatterDetail", { count: expDiag.n_points }),
    });
  }

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-white p-3 shadow dark:bg-gray-800">
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {stat.label}
          </div>
          <div className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-gray-100">
            {stat.value}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{stat.detail}</div>
        </div>
      ))}
    </div>
  );
}
