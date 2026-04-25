import { useCallback } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { WeightChart } from "../components/charts/WeightChart";
import { DerivativeChart } from "../components/charts/DerivativeChart";
import { ResidualsChart } from "../components/charts/ResidualsChart";

const HORIZON_OPTIONS = [
  { label: "4 weeks", value: 28 },
  { label: "8 weeks", value: 56 },
  { label: "3 months", value: 90 },
  { label: "6 months", value: 180 },
];

export function AnalysisPage() {
  const { chartParams, setChartParams, refreshKey, setSelectedPoint, accent } = useWeightTracker();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => setSelectedPoint(point),
    [setSelectedPoint]
  );

  return (
    <PageTransition>
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <PageTitle title="Analysis" subtitle="Rate of change and residuals vs. exponential decay model" />

      {/* Controls row */}
      <div className="flex flex-wrap gap-4 md:gap-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5">
        {/* Smoothing window */}
        <div className="flex-1 min-w-full md:min-w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Smoothing Window: <span className="font-bold">{chartParams.smoothing}</span>
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
            Extrapolation Horizon
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <WeightChart params={chartParams} refreshKey={refreshKey} onPointClick={handlePointClick} className="h-[260px] md:h-[380px]" />
      <DerivativeChart params={chartParams} refreshKey={refreshKey} />
      <ResidualsChart params={chartParams} refreshKey={refreshKey} />
    </div>
    </PageTransition>
  );
}
