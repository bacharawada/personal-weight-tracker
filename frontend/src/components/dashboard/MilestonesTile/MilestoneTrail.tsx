/**
 * MilestoneTrail — the milestones as a route between two marked endpoints.
 *
 * Built in HTML rather than a scaled SVG on purpose. A `viewBox` stretched to the
 * tile's width magnifies everything inside it — strokes, radii and type alike —
 * so the same drawing reads as delicate in a narrow card and enormous in a wide
 * one. Fixed-size dots and labels in a flex row stay put at any width.
 *
 * The road already travelled is drawn solid and thick, the road ahead dashed and
 * thin, so progress reads from the line itself rather than from colour alone.
 * The next milestone carries a halo: of all the stops it is the only actionable
 * one.
 *
 * The endpoints are markers, not dots: the start weight is where the journey
 * began and the goal is what it aims at, and neither is "just another stop". The
 * goal marker *is* the last milestone — its target equals the goal weight, so
 * drawing both would print the same number twice.
 *
 * Weights on the trail are printed bare; the unit appears once, in the sentence
 * beneath it. That keeps the markers narrow enough to leave the stops room on a
 * phone, where the tile spans the full width and the labels are tightest.
 */

import { useTranslation } from "react-i18next";
import { Flag, Target } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { hexToRgba } from "../../../lib/palettes";
import { kgToDisplay } from "../../../lib/units";
import type { Milestone } from "../../../lib/types";

/**
 * Ring in the tile's own surface colour, so each reached stop reads as a bead on
 * the line rather than a bulge in it — dot and line share the accent colour.
 */
const PUNCH_OUT = "ring-2 ring-white dark:ring-gray-800";

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
  const { unit, accent } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  // The last milestone is the goal itself; it is drawn as the end marker.
  const stops = milestones.slice(0, -1);
  const final = milestones[milestones.length - 1];
  const isGoalReached = final?.achieved === true;
  const achieved = milestones.filter((milestone) => milestone.achieved).length;

  const weight = (kg: number) => kgToDisplay(kg, unit).toFixed(1);

  /** Road behind is solid and thick; road ahead is dashed and thin. */
  const segment = (isDone: boolean) =>
    isDone
      ? "h-1 rounded-full"
      : "h-0 border-t-2 border-dashed border-gray-300 dark:border-gray-600";

  return (
    <div
      role="img"
      aria-label={t("milestones.trailLabel", {
        achieved,
        total: milestones.length,
      })}
      className="flex items-center gap-2"
    >
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
        <Flag size={11} aria-hidden="true" />
        {startWeightKg != null ? weight(startWeightKg) : t("milestones.startWeight")}
      </span>

      <div className="flex flex-1 items-center">
        {stops.map((milestone, index) => {
          const isNext = milestone.index === nextIndex;
          // Labels alternate so neighbours never compete for the same row.
          const isAbove = index % 2 === 0;
          return (
            // A definite height is load-bearing: an auto-height flex item
            // collapses to its content, and absolutely-positioned labels would
            // then anchor to the line itself instead of above and below it.
            <div key={milestone.index} className="relative h-12 flex-1">
              <span
                className={`absolute top-1/2 -translate-y-1/2 ${segment(milestone.achieved)}`}
                style={{
                  left: index === 0 ? 0 : "-50%",
                  right: "50%",
                  ...(milestone.achieved ? { backgroundColor: accent } : {}),
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
                  isNext
                    ? "h-3.5 w-3.5 bg-white dark:bg-gray-800"
                    : milestone.achieved
                      ? `h-2.5 w-2.5 ${PUNCH_OUT}`
                      : "h-2 w-2 bg-gray-300 dark:bg-gray-600",
                ].join(" ")}
                style={{
                  ...(milestone.achieved ? { backgroundColor: accent } : {}),
                  ...(isNext
                    ? {
                        boxShadow: `0 0 0 2.5px ${accent}, 0 0 0 7px ${hexToRgba(accent, 0.18)}`,
                      }
                    : {}),
                }}
              />
              <span
                className={[
                  "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none tabular-nums",
                  isAbove ? "top-0" : "bottom-0",
                  milestone.achieved
                    ? "font-medium text-gray-700 dark:text-gray-200"
                    : isNext
                      ? "font-semibold"
                      : "text-gray-400 dark:text-gray-500",
                ].join(" ")}
                style={isNext && !milestone.achieved ? { color: accent } : undefined}
              >
                {weight(milestone.target_weight)}
              </span>
            </div>
          );
        })}

        {/* Run from the last stop to the destination marker. */}
        <span
          className={`w-3 shrink-0 ${segment(isGoalReached)}`}
          style={isGoalReached ? { backgroundColor: accent } : undefined}
        />
      </div>

      <span
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums"
        style={
          isGoalReached
            ? { backgroundColor: accent, color: "#FFFFFF" }
            : { backgroundColor: hexToRgba(accent, 0.12), color: accent }
        }
      >
        <Target size={11} aria-hidden="true" />
        {goalWeightKg != null ? weight(goalWeightKg) : t("milestones.goalWeight")}
      </span>
    </div>
  );
}
