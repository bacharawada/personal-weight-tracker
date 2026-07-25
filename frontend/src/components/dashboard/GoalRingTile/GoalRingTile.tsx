/**
 * GoalRingTile — how far along the road to the goal, and when it ends.
 *
 * Merges the two panels this replaces: the goal projection (a paragraph) and
 * the milestones bar. The share complete becomes the ring, the ten milestones
 * become dots, and the projection collapses to plain facts — remaining weight,
 * projected date, and the optimistic/pessimistic window.
 *
 * Several projection statuses have no date to show (weight not trending down,
 * goal years away, too little data). Those keep the full sentence: a bare ring
 * would imply a certainty the model doesn't have.
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, Target, TriangleAlert } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { projectionCopy } from "../../../lib/dashboard/projectionCopy";
import { formatWeight } from "../../../lib/units";
import type { GoalProjection, MilestonesProjection } from "../../../lib/types";
import { Ring, Tile } from "../tiles";
import { MilestoneDots } from "./MilestoneDots";

interface GoalRingTileProps {
  goal: GoalProjection | null;
  milestones: MilestonesProjection | null;
  latestWeight: number | null;
}

export function GoalRingTile({ goal, milestones, latestWeight }: GoalRingTileProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  const goalWeight = profile?.goal_weight ?? null;

  // Nothing to project against yet — nudge the user toward Settings.
  if (goalWeight == null) {
    return (
      <Link
        to="/settings"
        className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Target size={16} />
          {t("goal.setupPrompt")}
        </span>
      </Link>
    );
  }

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
      <div className="flex items-center gap-4 mt-3">
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

      {milestones != null && milestones.milestones.length > 0 && (
        <div className="mt-4">
          <MilestoneDots milestones={milestones.milestones} />
        </div>
      )}

      {/* Goal set above the starting weight: the server explains why there are
          no milestones to walk through. */}
      {milestones != null && milestones.milestones.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-snug">
          {milestones.reason}
        </p>
      )}
    </Tile>
  );
}
