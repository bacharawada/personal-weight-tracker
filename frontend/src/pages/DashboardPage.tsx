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
import { TrajectoryPanel } from "../components/dashboard/TrajectoryPanel";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { chartParams, refreshKey, setSelectedPoint } = useWeightTracker();
  const { stats, goal, milestones, plateau, energy, latest, deltas } =
    useDashboardData();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => {
      setSelectedPoint(point);
    },
    [setSelectedPoint]
  );

  return (
    <PageTransition>
      <div className="flex flex-col p-4 md:p-8 pb-nav gap-4 md:gap-6">
        <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

        <TrajectoryPanel
          params={chartParams}
          refreshKey={refreshKey}
          latest={latest}
          deltas={deltas}
          onPointClick={handlePointClick}
        />

        <StatsCards stats={stats} />

        <GoalCard goal={goal} stats={stats} />

        <MilestonesCard data={milestones} />

        <PlateauCard status={plateau} />

        <EnergyCard energy={energy} />
      </div>
    </PageTransition>
  );
}
