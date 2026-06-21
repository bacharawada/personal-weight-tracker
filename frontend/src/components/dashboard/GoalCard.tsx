/**
 * GoalCard — dashboard panel summarising goal progress and BMI.
 *
 * Combines the server-side goal projection (/api/goal) with the user's
 * profile (height, goal weight) and latest measurement. When no goal or
 * height is configured it shows a quiet prompt linking to Settings.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, TriangleAlert, CheckCircle2, Activity } from "lucide-react";
import { getGoal, getStats } from "../../lib/api";
import type { GoalProjection, Stats } from "../../lib/types";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { formatWeight } from "../../lib/units";

interface GoalCardProps {
  refreshKey: number;
}

interface BmiInfo {
  value: number;
  category: string;
  color: string;
}

function computeBmi(weightKg: number, heightCm: number): BmiInfo {
  const bmi = weightKg / (heightCm / 100) ** 2;
  let category = "Normal";
  let color = "text-green-600";
  if (bmi < 18.5) {
    category = "Underweight";
    color = "text-blue-500";
  } else if (bmi >= 30) {
    category = "Obese";
    color = "text-red-600";
  } else if (bmi >= 25) {
    category = "Overweight";
    color = "text-amber-600";
  }
  return { value: bmi, category, color };
}

export function GoalCard({ refreshKey }: GoalCardProps) {
  const { profile, unit } = useWeightTracker();
  const [goal, setGoal] = useState<GoalProjection | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getGoal().then(setGoal).catch(console.error);
    getStats().then(setStats).catch(console.error);
  }, [refreshKey]);

  const hasGoal = profile?.goal_weight != null;
  const hasHeight = profile?.height_cm != null;
  const latestWeight = stats?.latest_weight ?? null;

  const bmi =
    hasHeight && latestWeight != null && profile?.height_cm != null
      ? computeBmi(latestWeight, profile.height_cm)
      : null;

  // Nothing configured yet — nudge the user toward Settings.
  if (!hasGoal && !hasHeight) {
    return (
      <Link
        to="/settings"
        className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Target size={16} />
          Set a goal weight and height in Settings to track your progress and BMI.
        </span>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Goal status */}
      {hasGoal && goal && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {goal.already_reached ? (
              <CheckCircle2 size={20} className="text-green-600" />
            ) : goal.reachable === false ? (
              <TriangleAlert size={20} className="text-amber-600" />
            ) : (
              <Target size={20} style={{ color: "var(--color-accent)" }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Goal</p>
              {profile?.goal_weight != null && (
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatWeight(profile.goal_weight, unit)}
                </p>
              )}
              {goal.on_track === true && !goal.already_reached && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                  On track
                </span>
              )}
              {goal.on_track === false && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  Behind
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
              {goal.reason}
            </p>
            {goal.days_remaining != null && goal.days_remaining > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ~{goal.days_remaining} day{goal.days_remaining !== 1 ? "s" : ""} to go
              </p>
            )}
          </div>
        </div>
      )}

      {/* BMI */}
      {hasHeight && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
          <Activity size={20} className="shrink-0 mt-0.5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Body Mass Index</p>
            {bmi ? (
              <>
                <p className={`text-xl font-bold leading-tight ${bmi.color}`}>
                  {bmi.value.toFixed(1)}
                  <span className="text-sm font-medium ml-2">{bmi.category}</span>
                </p>
                {profile?.height_cm != null && latestWeight != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {profile.height_cm} cm · {formatWeight(latestWeight, unit)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add a measurement to see your BMI.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
