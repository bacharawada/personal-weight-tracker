/**
 * DeltaStat — one column of the trajectory panel's change strip.
 *
 * Losing weight is the goal, so a negative change reads green and a positive
 * one red. Changes under the flat threshold stay neutral rather than colouring
 * scale noise as progress.
 */

import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { kgToDisplay, unitLabel } from "../../../lib/units";

/** Below this magnitude (kg) a change is scale noise, not a trend. */
const FLAT_THRESHOLD_KG = 0.05;

interface DeltaStatProps {
  label: string;
  /** Signed change in kg; negative means lost. `null` when not comparable. */
  valueKg: number | null;
}

export function DeltaStat({ label, valueKg }: DeltaStatProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();

  const isFlat = valueKg == null || Math.abs(valueKg) < FLAT_THRESHOLD_KG;
  const color = isFlat
    ? "text-gray-500 dark:text-gray-400"
    : valueKg < 0
      ? "text-green-600"
      : "text-red-600";

  let text = t("trajectory.noComparison");
  if (valueKg != null) {
    const converted = kgToDisplay(valueKg, unit);
    const sign = isFlat ? "" : converted > 0 ? "+" : "";
    text = `${sign}${converted.toFixed(1)} ${unitLabel(unit)}`;
  }

  return (
    <div className="text-right">
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
      <p className={`text-sm md:text-base font-semibold leading-tight mt-0.5 ${color}`}>
        {text}
      </p>
    </div>
  );
}
