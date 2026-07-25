import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { StatsCards } from "../components/layout/StatsCards";
import { GoalCard } from "../components/dashboard/GoalCard";
import { MilestonesCard } from "../components/dashboard/MilestonesCard";
import { PlateauCard } from "../components/dashboard/PlateauCard";
import { EnergyCard } from "../components/dashboard/EnergyCard";
import { WeightChart } from "../components/charts/WeightChart";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { chartParams, refreshKey, setSelectedPoint } = useWeightTracker();
  const { stats, goal, milestones, plateau, energy } = useDashboardData();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => {
      setSelectedPoint(point);
    },
    [setSelectedPoint]
  );

  return (
    <PageTransition>
      <div className="flex flex-col md:h-full p-4 md:p-8 pb-nav gap-4 md:gap-8">
        <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

        <StatsCards stats={stats} />

        <GoalCard goal={goal} stats={stats} />

        <MilestonesCard data={milestones} />

        <PlateauCard status={plateau} />

        <EnergyCard energy={energy} />

        <WeightChart
          params={chartParams}
          refreshKey={refreshKey}
          onPointClick={handlePointClick}
          className="h-[300px] md:h-auto md:flex-1 md:min-h-0"
        />
      </div>
    </PageTransition>
  );
}
