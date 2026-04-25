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
      <div className="flex flex-col h-full p-4 md:p-8 gap-4 md:gap-8">
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
