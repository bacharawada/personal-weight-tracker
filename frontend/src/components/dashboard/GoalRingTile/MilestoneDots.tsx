/**
 * MilestoneDots — the ten steps between the starting weight and the goal.
 *
 * Replaces the old progress bar with markers pinned by index: at tile width the
 * bar and its markers fought for the same pixels, while an evenly spaced row of
 * dots reads "seven of ten done" without a legend.
 */

import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { formatWeight } from "../../../lib/units";
import type { Milestone } from "../../../lib/types";

interface MilestoneDotsProps {
  milestones: Milestone[];
}

export function MilestoneDots({ milestones }: MilestoneDotsProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();
  const achieved = milestones.filter((milestone) => milestone.achieved).length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {milestones.map((milestone) => (
          <span
            key={milestone.index}
            title={formatWeight(milestone.target_weight, unit)}
            className={[
              "h-2 w-2 rounded-full",
              milestone.achieved
                ? "bg-green-600"
                : "bg-gray-200 dark:bg-gray-600",
            ].join(" ")}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("milestones.label")} {t("milestones.counter", {
          achieved,
          total: milestones.length,
        })}
      </p>
    </div>
  );
}
