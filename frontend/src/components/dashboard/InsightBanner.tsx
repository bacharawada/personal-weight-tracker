/**
 * InsightBanner — the page's opening sentence.
 *
 * Renders whichever headline `selectInsight` picked, tinted with the palette
 * accent so it reads as the page's conclusion rather than another tile. Renders
 * nothing when no rule matched: a banner stating the obvious would cost the
 * position that matters most on the page.
 */

import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { selectInsight } from "../../lib/dashboard/insight";
import { kgToDisplay, unitLabel } from "../../lib/units";
import type { DoseImpact, GoalProjection, PlateauStatus } from "../../lib/types";
import { hexToRgba } from "../../lib/palettes";

interface InsightBannerProps {
  goal: GoalProjection | null;
  plateau: PlateauStatus | null;
  doseChanges: DoseImpact[];
  streakDays: number;
}

export function InsightBanner({
  goal,
  plateau,
  doseChanges,
  streakDays,
}: InsightBannerProps) {
  const { t } = useTranslation("dashboard");
  const { unit, accent } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  const formatRate = (kgPerWeek: number): string =>
    `${kgPerWeek < 0 ? "−" : "+"}${kgToDisplay(Math.abs(kgPerWeek), unit).toFixed(2)} ${unitLabel(unit)}/wk`;

  const insight = selectInsight({
    goal,
    plateau,
    doseChanges,
    streakDays,
    formatRate,
    formatDate,
  });

  if (insight == null) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg p-4"
      style={{
        backgroundColor: hexToRgba(accent, 0.08),
        border: `1px solid ${hexToRgba(accent, 0.25)}`,
      }}
    >
      <Sparkles size={18} className="shrink-0 mt-0.5" style={{ color: accent }} />
      <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
        {t(`insight.${insight.key}`, insight.params)}
      </p>
    </div>
  );
}
