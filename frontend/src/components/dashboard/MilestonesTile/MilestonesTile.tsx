/**
 * MilestonesTile — the ten steps from the starting weight to the goal.
 *
 * Its own module now, rather than a strip at the bottom of the goal tile: the
 * concept carries a page slot on its own, and the trail needs the width to print
 * every target weight.
 */

import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Footprints, TriangleAlert } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { formatWeight } from "../../../lib/units";
import type { MilestonesProjection } from "../../../lib/types";
import { Tile } from "../tiles";
import { MilestoneTrail } from "./MilestoneTrail";

interface MilestonesTileProps {
  milestones: MilestonesProjection | null;
}

export function MilestonesTile({ milestones }: MilestonesTileProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();

  if (milestones == null) {
    return (
      <Tile label={t("milestones.label")} icon={<Footprints size={16} />}>
        <div className="relative h-28 mt-2 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </Tile>
    );
  }

  // A goal at or above the starting weight leaves nothing to step through; the
  // server explains why rather than us guessing.
  if (milestones.milestones.length === 0) {
    return (
      <Tile
        label={t("milestones.label")}
        icon={<TriangleAlert size={16} className="text-amber-600" />}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-snug">
          {milestones.reason}
        </p>
      </Tile>
    );
  }

  const achieved = milestones.milestones.filter(
    (milestone) => milestone.achieved,
  ).length;

  return (
    <Tile
      label={t("milestones.label")}
      icon={<Footprints size={16} style={{ color: "var(--color-accent)" }} />}
      action={
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {t("milestones.counter", {
            achieved,
            total: milestones.milestones.length,
          })}
        </span>
      }
    >
      <div className="mt-3">
        <MilestoneTrail
          milestones={milestones.milestones}
          goalWeightKg={milestones.goal_weight}
          startWeightKg={milestones.start_weight}
          nextIndex={milestones.next_milestone?.index ?? null}
        />
      </div>

      {milestones.next_milestone != null ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 leading-snug">
          {t("milestones.next", {
            target: formatWeight(milestones.next_milestone.target_weight, unit),
            remaining: formatWeight(milestones.next_milestone.kg_remaining, unit),
          })}
        </p>
      ) : (
        <p className="text-sm text-green-700 dark:text-green-400 mt-3 leading-snug">
          {t("milestones.allAchieved")}
        </p>
      )}
    </Tile>
  );
}
