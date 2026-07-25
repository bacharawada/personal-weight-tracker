/**
 * GoalRingTile — how far along the road to the goal, and when it ends.
 *
 * Replaces the goal projection paragraph: the share complete becomes the ring
 * and the projection collapses to plain facts — remaining weight, projected
 * date, and the optimistic/pessimistic window.
 *
 * Several projection statuses have no date to show (weight not trending down,
 * goal years away, too little data). Those keep the full sentence: a bare ring
 * would imply a certainty the model doesn't have.
 *
 * The pace block rides along as a side note. It sits beside the ring once the
 * tile is wide enough and drops beneath it otherwise — a viewport breakpoint
 * rather than a container query, since Tailwind 3 has none and this tile's width
 * follows the page grid predictably.
 */

import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { CheckCircle2, Target, TriangleAlert } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { projectionCopy } from "../../../lib/dashboard/projectionCopy";
import { formatWeight } from "../../../lib/units";
import type { GoalProjection, MilestonesProjection } from "../../../lib/types";
import { Ring, Tile } from "../tiles";
import { PaceInline } from "./PaceInline";

interface GoalRingTileProps {
  goal: GoalProjection | null;
  milestones: MilestonesProjection | null;
  latestWeight: number | null;
}

export function GoalRingTile({ goal, milestones, latestWeight }: GoalRingTileProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  // The page only renders this tile once a goal exists; the guard keeps the
  // narrowing honest rather than standing in for a missing-goal state.
  const goalWeight = profile?.goal_weight ?? null;
  if (goalWeight == null) return null;

  if (goal == null) {
    return (
      <Tile label={t("goal.label")}>
        <div className="relative h-16 mt-2 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </Tile>
    );
  }

  const copy = projectionCopy(goal, { t, unit, goalWeightKg: goalWeight, formatDate });
  const percent = milestones?.percent_complete ?? 0;
  const remainingKg =
    latestWeight != null ? Math.max(0, latestWeight - goalWeight) : null;
  const hasDate = goal.predicted_date != null;

  const badge = goal.already_reached
    ? { text: t("goal.reached"), classes: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" }
    : goal.on_track === true
      ? { text: t("goal.onTrack"), classes: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" }
      : goal.on_track === false
        ? { text: t("goal.behind"), classes: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" }
        : null;

  return (
    <Tile
      label={`${t("goal.label")} · ${formatWeight(goalWeight, unit)}`}
      icon={
        goal.already_reached ? (
          <CheckCircle2 size={16} className="text-green-600" />
        ) : goal.reachable === false ? (
          <TriangleAlert size={16} className="text-amber-600" />
        ) : (
          <Target size={16} style={{ color: "var(--color-accent)" }} />
        )
      }
      action={
        badge && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.classes}`}>
            {badge.text}
          </span>
        )
      }
    >
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-5 mt-3">
        <div className="flex items-center gap-4 xl:flex-1 xl:min-w-0">
          <Ring
            percent={percent}
            ariaLabel={t("goal.ringLabel", { percent: Math.round(percent) })}
          />
          <div className="min-w-0">
            {hasDate ? (
              <>
                {remainingKg != null && (
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {t("goal.remaining", { value: formatWeight(remainingKg, unit) })}
                  </p>
                )}
                {goal.predicted_date != null && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
                    {t("goal.projectedDate", { date: formatDate(goal.predicted_date) })}
                  </p>
                )}
                {copy.range != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    {copy.range}
                  </p>
                )}
              </>
            ) : (
              copy.summary !== "" && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                  {copy.summary}
                </p>
              )
            )}
          </div>
        </div>

        <div className="border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-gray-700 pt-3 xl:pt-0 xl:pl-5 xl:w-52 xl:shrink-0">
          <PaceInline goal={goal} latestWeight={latestWeight} />
        </div>
      </div>
    </Tile>
  );
}
