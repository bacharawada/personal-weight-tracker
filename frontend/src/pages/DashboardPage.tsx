import { useCallback } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { StatsCards } from "../components/layout/StatsCards";
import { WeightChart } from "../components/charts/WeightChart";

export function DashboardPage() {
  const { chartParams, refreshKey, setSelectedPoint } = useWeightTracker();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => {
      setSelectedPoint(point);
    },
    [setSelectedPoint]
  );

  return (
    <PageTransition>
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Overview of your weight progression
        </p>
      </div>

      <StatsCards refreshKey={refreshKey} />

      <WeightChart
        params={chartParams}
        refreshKey={refreshKey}
        onPointClick={handlePointClick}
      />
    </div>
    </PageTransition>
  );
}
