import { useCallback } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
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
      <PageTitle title="Dashboard" subtitle="Overview of your weight progression" />

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
