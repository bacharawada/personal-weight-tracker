/**
 * EventRow — one entry of the timeline: a dot on the rail, a headline, a detail.
 *
 * Each kind gets its own glyph and colour so the stream is scannable without
 * reading it, and the detail line carries the number that makes the event worth
 * recording — the weight crossed, the plateau's length, the pace on either side
 * of a dose change.
 */

import { useTranslation } from "react-i18next";
import { Flag, Minus, Syringe, Trophy } from "lucide-react";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { formatWeight, kgToDisplay, unitLabel } from "../../../lib/units";
import { EventKind, type DashboardEvent } from "../../../lib/dashboard/events";

interface EventRowProps {
  event: DashboardEvent;
  /** Last row of the list — the rail must stop at its dot. */
  isLast: boolean;
}

export function EventRow({ event, isLast }: EventRowProps) {
  const { t } = useTranslation("dashboard");
  const { t: tMed } = useTranslation("medication");
  const { unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  const rate = (value: number): string =>
    `${value < 0 ? "−" : "+"}${kgToDisplay(Math.abs(value), unit).toFixed(2)} ${unitLabel(unit)}/wk`;

  let icon = <Flag size={14} />;
  let iconColor = "text-gray-400 dark:text-gray-500";
  let headline = "";
  let detail: string | null = null;

  switch (event.kind) {
    case EventKind.Start:
      headline = t("timeline.start");
      detail = formatWeight(event.weightKg, unit);
      break;

    case EventKind.Milestone:
      icon = <Trophy size={14} />;
      iconColor = "text-green-600";
      headline = t("timeline.milestone", { index: event.index });
      detail = formatWeight(event.targetWeightKg, unit);
      break;

    case EventKind.Plateau:
      icon = <Minus size={14} />;
      iconColor = "text-amber-600";
      headline = t("timeline.plateau", { count: event.durationDays });
      detail = t("timeline.plateauUntil", { date: formatDate(event.endDate) });
      break;

    case EventKind.Dose: {
      icon = <Syringe size={14} />;
      iconColor = "text-[color:var(--color-accent)]";
      const dose =
        event.doseMg != null ? tMed("dose.mg", { value: event.doseMg }) : "";
      headline = event.isFirst
        ? t("timeline.doseStarted", { medication: event.medication, dose })
        : t("timeline.doseChanged", {
            medication: event.medication,
            from:
              event.previousDoseMg != null
                ? tMed("dose.mg", { value: event.previousDoseMg })
                : "",
            to: dose,
          });
      // The whole point of a dose event: what the trajectory did around it.
      if (event.slopeBeforePerWeek != null && event.slopeAfterPerWeek != null) {
        detail = t("timeline.paceShift", {
          before: rate(event.slopeBeforePerWeek),
          after: rate(event.slopeAfterPerWeek),
        });
      }
      break;
    }
  }

  return (
    <li className={`relative pl-8 ${isLast ? "" : "pb-4"}`}>
      {/* The rail joins each dot to the next, so the last row has none. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[9px] top-5 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
        />
      )}
      <span
        className={`absolute left-0 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 ${iconColor}`}
      >
        {icon}
      </span>

      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-sm text-gray-900 dark:text-gray-100 leading-snug">
          {headline}
        </p>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDate(event.date)}
        </span>
      </div>
      {detail && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{detail}</p>
      )}
    </li>
  );
}
