import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Flame, Footprints, Target } from "lucide-react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { WelcomePanel } from "../components/dashboard/WelcomePanel";
import { LoadErrorPanel } from "../components/dashboard/LoadErrorPanel";
import { EnergyTile } from "../components/dashboard/EnergyTile";
import { TrajectoryPanel } from "../components/dashboard/TrajectoryPanel";
import { GoalRingTile } from "../components/dashboard/GoalRingTile";
import { BmiTile } from "../components/dashboard/BmiTile";
import { MilestonesTile } from "../components/dashboard/MilestonesTile";
import { ConsistencyTile } from "../components/dashboard/ConsistencyTile";
import { MomentumTile } from "../components/dashboard/MomentumTile";
import { EventTimeline } from "../components/dashboard/EventTimeline";
import { LockedTile } from "../components/dashboard/tiles";
import { Spinner } from "../components/ui/Spinner";
import { computeConsistency } from "../lib/dashboard/consistency";
import { computeGates } from "../lib/dashboard/unlocks";
import { useDashboardData } from "../hooks/useDashboardData";

/** Which of the four mutually exclusive dashboard states is on screen. */
type PageState = "loading" | "error" | "welcome" | "ready";

/**
 * Pick the page state.
 *
 * Data wins over an error: a failed refresh on top of rows we already hold
 * keeps the dashboard up (slightly stale) rather than replacing it with a
 * panel. The error panel is only for having nothing to show.
 */
function resolvePageState(
  isLoading: boolean,
  hasLoadError: boolean,
  hasAnyData: boolean
): PageState {
  if (isLoading) return "loading";
  if (hasAnyData) return "ready";
  return hasLoadError ? "error" : "welcome";
}

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { bump, chartParams, profile, refreshKey, setSelectedPoint } = useWeightTracker();
  const {
    goal,
    milestones,
    plateau,
    energy,
    energySeries,
    doseChanges,
    measurements,
    latest,
    deltas,
    isLoading,
    hasLoadError,
  } = useDashboardData();

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => {
      setSelectedPoint(point);
    },
    [setSelectedPoint]
  );

  const gates = computeGates(measurements, profile);
  const consistency = computeConsistency(measurements);
  const latestWeight = latest?.weight ?? null;
  const pageState = resolvePageState(isLoading, hasLoadError, gates.hasAnyData);

  // Whichever threshold is still short does the explaining.
  const trendHint =
    gates.measurementsToTrend > 0
      ? t("locked.needMeasurements", { count: gates.measurementsToTrend })
      : t("locked.needDays", { count: gates.daysToTrend });

  return (
    <PageTransition>
      <div className="flex flex-col p-4 md:p-8 pb-nav gap-4 md:gap-6">
        <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

        {pageState === "loading" && (
          <div className="flex items-center justify-center py-24">
            <Spinner size={36} />
          </div>
        )}

        {pageState === "error" && <LoadErrorPanel onRetry={bump} />}

        {pageState === "welcome" && <WelcomePanel />}

        {pageState === "ready" && (
          <>
            <TrajectoryPanel
              params={chartParams}
              refreshKey={refreshKey}
              latest={latest}
              deltas={deltas}
              onPointClick={handlePointClick}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {gates.hasGoal ? (
                <GoalRingTile
                  goal={goal}
                  milestones={milestones}
                  latestWeight={latestWeight}
                />
              ) : (
                <LockedTile
                  label={t("goal.label")}
                  icon={<Target size={16} />}
                  hint={t("locked.needGoal")}
                  to="/settings"
                />
              )}

              {gates.hasGoal ? (
                <MilestonesTile milestones={milestones} />
              ) : (
                <LockedTile
                  label={t("milestones.label")}
                  icon={<Footprints size={16} />}
                  hint={t("locked.needGoal")}
                  to="/settings"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
              <ConsistencyTile consistency={consistency} />

              {gates.hasTrend ? (
                <MomentumTile measurements={measurements} plateau={plateau} />
              ) : (
                <LockedTile
                  label={t("momentum.label")}
                  icon={<Activity size={16} />}
                  hint={trendHint}
                />
              )}

              {gates.hasEnergy ? (
                <EnergyTile energy={energy} series={energySeries} />
              ) : (
                <LockedTile
                  label={t("energy.label")}
                  icon={<Flame size={16} />}
                  hint={t("locked.needDays", { count: gates.daysToEnergy })}
                />
              )}

              {gates.hasHeight ? (
                <BmiTile latestWeight={latestWeight} />
              ) : (
                <LockedTile
                  label={t("bmi.label")}
                  icon={<Activity size={16} />}
                  hint={t("locked.needHeight")}
                  to="/settings"
                />
              )}
            </div>

            <EventTimeline
              measurements={measurements}
              milestones={milestones}
              plateau={plateau}
              doseChanges={doseChanges}
            />
          </>
        )}
      </div>
    </PageTransition>
  );
}
