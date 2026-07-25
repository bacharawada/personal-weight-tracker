/**
 * ConsistencyTile — how regularly the scale gets used.
 *
 * Absorbs the two most inert numbers of the old stat row, "days tracked" and
 * "measurements", by giving them the context that makes them mean something: a
 * calendar of the last twelve weeks and the current streak. Every trend on this
 * page is only as good as the density of this grid.
 */

import { useTranslation } from "react-i18next";
import { CalendarCheck } from "lucide-react";
import { computeConsistency, CONSISTENCY_WEEKS } from "../../lib/dashboard/consistency";
import type { Measurement } from "../../lib/types";
import { Tile } from "./tiles";

interface ConsistencyTileProps {
  measurements: Measurement[];
}

export function ConsistencyTile({ measurements }: ConsistencyTileProps) {
  const { t } = useTranslation("dashboard");
  const { weeks, streakDays, measurementCount, daysTracked } =
    computeConsistency(measurements);

  return (
    <Tile label={t("consistency.label")} icon={<CalendarCheck size={16} />}>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight mt-2">
        {t("consistency.streak", { count: streakDays })}
      </p>

      <div className="flex gap-1 mt-3" aria-hidden="true">
        {weeks.map((week) => (
          <div key={week[0].iso} className="flex flex-col gap-1">
            {week.map((day) => (
              <span
                key={day.iso}
                title={day.isPadding ? undefined : day.iso}
                className={[
                  "h-2 w-2 rounded-[2px]",
                  day.isPadding
                    ? "bg-transparent"
                    : day.hasMeasurement
                      ? ""
                      : "bg-gray-100 dark:bg-gray-700",
                ].join(" ")}
                style={
                  !day.isPadding && day.hasMeasurement
                    ? { backgroundColor: "var(--color-accent)" }
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        {t("consistency.summary", {
          count: measurementCount,
          weeks: CONSISTENCY_WEEKS,
        })}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("consistency.daysTracked", { count: daysTracked })}
      </p>
    </Tile>
  );
}
