/**
 * MilestonesCard — dashboard panel showing progress through the 10
 * weight-loss milestones between the starting weight and the goal.
 *
 * Combines the server-side milestones projection (/api/goal/milestones)
 * with the user's profile (goal weight). When no goal is configured it
 * shows a quiet prompt linking to Settings, mirroring GoalCard.
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Target, CheckCircle2, TriangleAlert } from "lucide-react";
import type { MilestonesProjection } from "../../lib/types";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { formatWeight } from "../../lib/units";

interface MilestonesCardProps {
  data: MilestonesProjection | null;
}

export function MilestonesCard({ data }: MilestonesCardProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();

  const hasGoal = profile?.goal_weight != null;

  // No goal configured yet — nudge the user toward Settings.
  if (!hasGoal) {
    return (
      <Link
        to="/settings"
        className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Target size={16} />
          {t("milestones.setupPrompt")}
        </span>
      </Link>
    );
  }

  // Goal configured but the data hasn't been fetched yet — shimmer skeleton.
  if (!data) {
    return (
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-[100px] overflow-hidden">
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  // Goal set but not below the starting weight — data.milestones is empty.
  // Surface the server's reason instead of an empty progress bar.
  if (data.milestones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
        <TriangleAlert size={20} className="shrink-0 mt-0.5 text-amber-600" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("milestones.label")}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
            {data.reason}
          </p>
        </div>
      </div>
    );
  }

  const total = data.milestones.length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="milestones-content"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
      >
        <div className="flex items-baseline gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("milestones.label")}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {t("milestones.counter", {
              achieved: data.current_milestone_index,
              total,
            })}
          </p>
        </div>

        {/* Progress bar with per-milestone markers */}
        <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-700 mt-4">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${data.percent_complete}%`,
              backgroundColor: "var(--color-accent)",
            }}
          />
          {data.milestones.map((milestone) => (
            <div
              key={milestone.index}
              title={formatWeight(milestone.target_weight, unit)}
              className={[
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-gray-800",
                milestone.achieved
                  ? "border-green-600"
                  : "border-gray-300 dark:border-gray-600",
              ].join(" ")}
              style={{ left: `${(milestone.index / total) * 100}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>
            {t("milestones.startWeight")}
            {data.start_weight != null && `: ${formatWeight(data.start_weight, unit)}`}
          </span>
          <span>
            {t("milestones.goalWeight")}
            {data.goal_weight != null && `: ${formatWeight(data.goal_weight, unit)}`}
          </span>
        </div>

        {data.next_milestone ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-snug">
            {t("milestones.nextMilestone")}: {formatWeight(data.next_milestone.target_weight, unit)}
            {" — "}
            {t("milestones.kgRemaining", {
              value: formatWeight(data.next_milestone.kg_remaining, unit),
            })}
          </p>
        ) : (
          <p className="text-sm text-green-700 dark:text-green-400 mt-2 leading-snug flex items-center gap-1">
            <CheckCircle2 size={14} />
            {t("milestones.allAchieved")}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
