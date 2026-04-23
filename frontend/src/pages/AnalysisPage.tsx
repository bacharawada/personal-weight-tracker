import { useCallback } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
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
  const { chartParams, setChartParams, refreshKey, setSelectedPoint } = useWeightTracker();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => setSelectedPoint(point),
    [setSelectedPoint]
  );

  return (
    <PageTransition>
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Analysis</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rate of change and residuals vs. exponential decay model
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-6 bg-white dark:bg-gray-800 rounded-lg shadow p-5">
        {/* Smoothing window */}
        <div className="flex-1 min-w-48">
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
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3</span><span>10</span>
          </div>
        </div>

        {/* Extrapolation horizon */}
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Extrapolation Horizon
          </label>
          <div className="flex flex-wrap gap-2">
            {HORIZON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setChartParams({ ...chartParams, horizon: opt.value })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chartParams.horizon === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <WeightChart params={chartParams} refreshKey={refreshKey} onPointClick={handlePointClick} />
      <DerivativeChart params={chartParams} refreshKey={refreshKey} />
      <ResidualsChart params={chartParams} refreshKey={refreshKey} />
    </div>
    </PageTransition>
  );
}
