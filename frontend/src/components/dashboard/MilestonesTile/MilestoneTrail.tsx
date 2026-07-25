/**
 * MilestoneTrail — the milestones as a route between two marked endpoints.
 *
 * Built in HTML rather than a scaled SVG on purpose. A `viewBox` stretched to the
 * tile's width magnifies everything inside it — strokes, radii and type alike —
 * so the same drawing reads as delicate in a narrow card and enormous in a wide
 * one. Fixed-size dots and labels in a flex row stay put at any width.
 *
 * The endpoints are markers, not dots: the start weight is where the journey
 * began and the goal is what it aims at, and neither is "just another stop". The
 * goal marker *is* the tenth milestone — its target equals the goal weight, so
 * drawing both would print the same number twice.
 *
 * Labels alternate above and below the line, which halves the horizontal room
 * each one needs and lets every target weight be printed rather than hovered.
 */

import { useTranslation } from "react-i18next";
import { Flag, Target } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { formatWeight, kgToDisplay } from "../../../lib/units";
import type { Milestone } from "../../../lib/types";

interface MilestoneTrailProps {
  milestones: Milestone[];
  /** The goal weight in kg — the trail's destination marker. */
  goalWeightKg: number | null;
  /** The first recorded weight in kg — the trail's origin marker. */
  startWeightKg: number | null;
  /** 1-based index of the next milestone, or `null` when all are achieved. */
  nextIndex: number | null;
}

export function MilestoneTrail({
  milestones,
  goalWeightKg,
  startWeightKg,
  nextIndex,
}: MilestoneTrailProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  // The last milestone is the goal itself; it is drawn as the end marker.
  const stops = milestones.slice(0, -1);
  const final = milestones[milestones.length - 1];
  const isGoalReached = final?.achieved === true;
  const achieved = milestones.filter((milestone) => milestone.achieved).length;

  const line = (isDone: boolean) =>
    isDone ? "" : "bg-gray-200 dark:bg-gray-700";

  return (
    <div
      role="img"
      aria-label={t("milestones.trailLabel", {
        achieved,
        total: milestones.length,
      })}
      className="flex items-center gap-1.5"
    >
      {/* Origin marker */}
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        <Flag size={11} aria-hidden="true" />
        {startWeightKg != null ? formatWeight(startWeightKg, unit) : t("milestones.startWeight")}
      </span>

      <div className="relative flex h-11 flex-1 items-center">
        {stops.map((milestone, index) => {
          const isNext = milestone.index === nextIndex;
          // Labels alternate so neighbours never compete for the same row.
          const isAbove = index % 2 === 0;
          return (
            <div key={milestone.index} className="relative flex-1">
              {/* Segment leading into this stop; the first runs from the origin. */}
              <span
                className={`absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full ${line(milestone.achieved)}`}
                style={{
                  left: index === 0 ? 0 : "-50%",
                  right: "50%",
                  ...(milestone.achieved
                    ? { backgroundColor: "var(--color-accent)" }
                    : {}),
                }}
              />
              <span
                title={
                  milestone.achieved && milestone.achieved_date != null
                    ? formatDate(milestone.achieved_date)
                    : t("milestones.notYet")
                }
                className={[
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  isNext ? "h-3 w-3 bg-white dark:bg-gray-800" : "h-2 w-2",
                  !milestone.achieved && !isNext ? "bg-gray-300 dark:bg-gray-600" : "",
                ].join(" ")}
                style={{
                  ...(milestone.achieved ? { backgroundColor: "var(--color-accent)" } : {}),
                  ...(isNext ? { boxShadow: "0 0 0 2px var(--color-accent)" } : {}),
                }}
              />
              <span
                className={[
                  "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none",
                  isAbove ? "top-0" : "bottom-0",
                  milestone.achieved
                    ? "font-semibold text-gray-700 dark:text-gray-200"
                    : isNext
                      ? "font-semibold text-gray-600 dark:text-gray-300"
                      : "text-gray-400 dark:text-gray-500",
                ].join(" ")}
              >
                {kgToDisplay(milestone.target_weight, unit).toFixed(1)}
              </span>
            </div>
          );
        })}

        {/* Segment from the last stop to the destination marker. */}
        <span
          className={`h-[3px] w-3 rounded-full ${line(isGoalReached)}`}
          style={isGoalReached ? { backgroundColor: "var(--color-accent)" } : undefined}
        />
      </div>

      {/* Destination marker — the tenth milestone. */}
      <span
        className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
        style={
          isGoalReached
            ? {
                backgroundColor: "var(--color-accent)",
                borderColor: "var(--color-accent)",
                color: "#FFFFFF",
              }
            : { borderColor: "var(--color-accent)", color: "var(--color-accent)" }
        }
      >
        <Target size={11} aria-hidden="true" />
        {goalWeightKg != null ? formatWeight(goalWeightKg, unit) : t("milestones.goalWeight")}
      </span>
    </div>
  );
}
