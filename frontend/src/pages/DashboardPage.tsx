import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { EnergyCard } from "../components/dashboard/EnergyCard";
import { TrajectoryPanel } from "../components/dashboard/TrajectoryPanel";
import { GoalRingTile } from "../components/dashboard/GoalRingTile";
import { BmiTile } from "../components/dashboard/BmiTile";
import { PaceTile } from "../components/dashboard/PaceTile";
import { ConsistencyTile } from "../components/dashboard/ConsistencyTile";
import { MomentumTile } from "../components/dashboard/MomentumTile";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { chartParams, refreshKey, setSelectedPoint } = useWeightTracker();
  const { goal, milestones, plateau, energy, measurements, latest, deltas } =
    useDashboardData();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => {
      setSelectedPoint(point);
    },
    [setSelectedPoint]
  );

  const latestWeight = latest?.weight ?? null;

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <GoalRingTile
            goal={goal}
            milestones={milestones}
            latestWeight={latestWeight}
          />
          <PaceTile goal={goal} latestWeight={latestWeight} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          <ConsistencyTile measurements={measurements} />
          <MomentumTile measurements={measurements} plateau={plateau} />
          <EnergyCard energy={energy} />
          <BmiTile latestWeight={latestWeight} />
        </div>
      </div>
    </PageTransition>
  );
}
