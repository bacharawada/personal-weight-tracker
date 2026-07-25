/**
 * BmiTile — body mass index for the latest weight, placed on its scale.
 *
 * "28.4, overweight" says where you are but not how far from anywhere else.
 * The marker on the bands shows the distance to the next category, and when a
 * goal weight is set a second marker shows which band that goal lands in — the
 * goal restated in health terms rather than kilograms.
 *
 * Extracted from GoalCard when the dashboard was reworked: BMI and goal
 * progress answer different questions and no longer share a panel.
 */

import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { formatWeight } from "../../lib/units";
import { BandScale, Tile, type ScaleBand } from "./tiles";

/** Visible domain of the scale — wide enough to hold every plausible value. */
const SCALE_MIN = 15;
const SCALE_MAX = 40;

/** The standard WHO cut-offs, as bands of the scale. */
const BANDS: ScaleBand[] = [
  { to: 18.5, className: "bg-blue-200 dark:bg-blue-900/50" },
  { to: 25, className: "bg-green-200 dark:bg-green-900/50" },
  { to: 30, className: "bg-amber-200 dark:bg-amber-900/50" },
  { to: SCALE_MAX, className: "bg-red-200 dark:bg-red-900/50" },
];

interface BmiTileProps {
  latestWeight: number | null;
}

interface BmiInfo {
  value: number;
  categoryKey: string;
  color: string;
}

function computeBmi(weightKg: number, heightCm: number): BmiInfo {
  const bmi = weightKg / (heightCm / 100) ** 2;
  let categoryKey = "normal";
  let color = "text-green-600";
  if (bmi < 18.5) {
    categoryKey = "underweight";
    color = "text-blue-500";
  } else if (bmi >= 30) {
    categoryKey = "obese";
    color = "text-red-600";
  } else if (bmi >= 25) {
    categoryKey = "overweight";
    color = "text-amber-600";
  }
  return { value: bmi, categoryKey, color };
}

export function BmiTile({ latestWeight }: BmiTileProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();

  const heightCm = profile?.height_cm ?? null;
  if (heightCm == null) return null;

  const bmi = latestWeight != null ? computeBmi(latestWeight, heightCm) : null;
  const goalWeight = profile?.goal_weight ?? null;
  const goalBmi = goalWeight != null ? computeBmi(goalWeight, heightCm) : null;

  return (
    <Tile label={t("bmi.label")} icon={<Activity size={16} />}>
      {bmi ? (
        <>
          <p className={`text-xl font-bold leading-tight mt-2 ${bmi.color}`}>
            {bmi.value.toFixed(1)}
            <span className="text-sm font-medium ml-2">
              {t(`bmi.category.${bmi.categoryKey}`)}
            </span>
          </p>

          <div className="mt-4">
            <BandScale
              min={SCALE_MIN}
              max={SCALE_MAX}
              bands={BANDS}
              value={bmi.value}
              ghost={
                goalBmi && {
                  value: goalBmi.value,
                  label: t("bmi.atGoal", { value: goalBmi.value.toFixed(1) }),
                }
              }
              ariaLabel={t("bmi.scaleLabel", {
                value: bmi.value.toFixed(1),
                category: t(`bmi.category.${bmi.categoryKey}`),
              })}
            />
          </div>

          {latestWeight != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {heightCm} cm · {formatWeight(latestWeight, unit)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("bmi.addMeasurement")}
        </p>
      )}
    </Tile>
  );
}
