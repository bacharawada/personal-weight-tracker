import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { WeightChart } from "../components/charts/WeightChart";
import { DerivativeChart } from "../components/charts/DerivativeChart";
import { EnergyChart } from "../components/charts/EnergyChart";
import { ResidualsChart } from "../components/charts/ResidualsChart";
import { AxisControls } from "../components/charts/AxisControls";
import { ChartExplainer } from "../components/charts/ChartExplainer";
import { ModelStatsStrip } from "../components/charts/ModelStatsStrip";
import { DoseImpactTable } from "../components/charts/DoseImpactTable";
import { WeightChartExplainer } from "../components/charts/explainers/WeightChartExplainer";
import { DerivativeChartExplainer } from "../components/charts/explainers/DerivativeChartExplainer";
import { EnergyChartExplainer } from "../components/charts/explainers/EnergyChartExplainer";
import { ResidualsChartExplainer } from "../components/charts/explainers/ResidualsChartExplainer";
import { AUTO_AXES, type ChartAxes, type WeightChartData } from "../lib/types";

const HORIZON_OPTIONS = [
  { unit: "weeks", count: 4, value: 28 },
  { unit: "weeks", count: 8, value: 56 },
  { unit: "months", count: 3, value: 90 },
  { unit: "months", count: 6, value: 180 },
] as const;

export function AnalysisPage() {
  const { t } = useTranslation("analysis");
  const { t: tMed } = useTranslation("medication");
  const { chartParams, setChartParams, refreshKey, setSelectedPoint, accent, unit } = useWeightTracker();
  const [axes, setAxes] = useState<ChartAxes>(AUTO_AXES);
  const [weightData, setWeightData] = useState<WeightChartData | null>(null);

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => setSelectedPoint(point),
    [setSelectedPoint]
  );

  return (
    <PageTransition>
    <div className="p-4 md:p-8 pb-nav space-y-4 md:space-y-8">
      <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

      {/* Controls row */}
      <div className="flex flex-wrap gap-4 md:gap-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5">
        {/* Smoothing window */}
        <div className="flex-1 min-w-full md:min-w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("controls.smoothingWindow")} <span className="font-bold">{chartParams.smoothing}</span>
          </label>
          <input
            type="range"
            min={3}
            max={10}
            step={1}
            value={chartParams.smoothing}
            onChange={(e) =>
              setChartParams({ ...chartParams, smoothing: Number(e.target.value) })
            }
            className="w-full"
            style={{
              accentColor: accent,
              outline: "none",
              boxShadow: "none",
            } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3</span><span>10</span>
          </div>
        </div>

        {/* Extrapolation horizon */}
        <div className="flex-1 min-w-full md:min-w-64">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("controls.extrapolationHorizon")}
          </label>
          <div className="flex flex-wrap gap-2">
            {HORIZON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setChartParams({ ...chartParams, horizon: opt.value })}
                className={`px-3 py-2 md:py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chartParams.horizon !== opt.value
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    : "text-white"
                }`}
                style={
                  chartParams.horizon === opt.value
                    ? { backgroundColor: accent }
                    : undefined
                }
              >
                {t(`horizon.${opt.unit}`, { count: opt.count })}
              </button>
            ))}
          </div>
        </div>

        {/* Prediction models */}
        <div className="flex-1 min-w-full md:min-w-56">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("controls.predictionModels")}
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={chartParams.showExp}
                onChange={(e) =>
                  setChartParams({ ...chartParams, showExp: e.target.checked })
                }
                style={{ accentColor: accent }}
              />
              {t("controls.exponentialDecay")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={chartParams.showLinear}
                onChange={(e) =>
                  setChartParams({ ...chartParams, showLinear: e.target.checked })
                }
                style={{ accentColor: accent }}
              />
              {t("controls.linearTrend")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={chartParams.showBand}
                onChange={(e) =>
                  setChartParams({ ...chartParams, showBand: e.target.checked })
                }
                style={{ accentColor: accent }}
              />
              {t("controls.showUncertaintyBand")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={chartParams.showDoses}
                onChange={(e) =>
                  setChartParams({ ...chartParams, showDoses: e.target.checked })
                }
                style={{ accentColor: accent }}
              />
              {tMed("chart.toggle")}
            </label>
          </div>
        </div>
      </div>

      <AxisControls axes={axes} onChange={setAxes} points={weightData?.raw ?? []} />

      <ModelStatsStrip models={weightData?.models ?? []} unit={unit} />

      <WeightChart
        params={chartParams}
        refreshKey={refreshKey}
        onPointClick={handlePointClick}
        axes={axes}
        className="h-[260px] md:h-[380px]"
        onDataLoaded={setWeightData}
      />
      <ChartExplainer title={t("explainerTitles.weight")}>
        <WeightChartExplainer data={weightData} params={chartParams} unit={unit} />
      </ChartExplainer>

      <DoseImpactTable refreshKey={refreshKey} unit={unit} />

      <DerivativeChart params={chartParams} refreshKey={refreshKey} />
      <ChartExplainer title={t("explainerTitles.derivative")}>
        <DerivativeChartExplainer unit={unit} />
      </ChartExplainer>

      <EnergyChart params={chartParams} refreshKey={refreshKey} />
      <ChartExplainer title={t("explainerTitles.energy")}>
        <EnergyChartExplainer />
      </ChartExplainer>

      <ResidualsChart params={chartParams} refreshKey={refreshKey} />
      <ChartExplainer title={t("explainerTitles.residuals")}>
        <ResidualsChartExplainer />
      </ChartExplainer>
    </div>
    </PageTransition>
  );
}
