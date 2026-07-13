/**
 * DoseImpactTable — "Dose-change impact" table on the Analysis page.
 *
 * For each medication dose change it shows the weight trend (kg/week, in the
 * user's display unit) in the window before vs. after the change, plus the
 * delta. Degrades gracefully when a window has too few measurements.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMedicationImpact } from "../../lib/api";
import type { DoseImpact, WeightUnit } from "../../lib/types";
import { kgToDisplay, unitLabel } from "../../lib/units";
import { Spinner } from "../ui/Spinner";

interface DoseImpactTableProps {
  refreshKey: number;
  unit: WeightUnit;
}

export function DoseImpactTable({ refreshKey, unit }: DoseImpactTableProps) {
  const { t } = useTranslation("medication");
  const [rows, setRows] = useState<DoseImpact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `loading` starts true; setState here stays inside async callbacks so the
    // effect body itself performs no synchronous state update.
    getMedicationImpact()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const u = unitLabel(unit);
  const windowDays = rows[0]?.window_days ?? 28;

  const formatSlope = (perWeek: number): string =>
    t("impact.perWeek", { value: kgToDisplay(perWeek, unit).toFixed(2), unit: u });

  const changeLabel = (row: DoseImpact): string => {
    if (row.is_first) {
      return row.dose_mg != null
        ? t("impact.firstDoseWithMg", {
            medication: row.medication,
            dose: row.dose_mg,
          })
        : t("impact.firstDose", { medication: row.medication });
    }
    return t("impact.doseChange", {
      medication: row.medication,
      from: row.previous_dose_mg ?? "—",
      to: row.dose_mg ?? "—",
    });
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 md:p-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("impact.title")}
      </h3>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {t("impact.subtitle", { window: windowDays })}
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size={24} />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("impact.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-3 font-medium">{t("impact.colChange")}</th>
                <th className="py-2 px-3 text-right font-medium">
                  {t("impact.colBefore")}
                </th>
                <th className="py-2 px-3 text-right font-medium">
                  {t("impact.colAfter")}
                </th>
                <th className="py-2 pl-3 text-right font-medium">
                  {t("impact.colDelta")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row, i) => {
                const hasBoth =
                  row.slope_before_per_week != null &&
                  row.slope_after_per_week != null;
                return (
                  <tr key={`${row.date}-${row.medication}-${i}`}>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {changeLabel(row)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {row.date}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-800 dark:text-gray-200">
                      {row.slope_before_per_week != null ? (
                        formatSlope(row.slope_before_per_week)
                      ) : (
                        <span
                          className="text-gray-400 dark:text-gray-500"
                          title={t("impact.insufficientDetail", { window: windowDays })}
                        >
                          {t("impact.insufficient")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-800 dark:text-gray-200">
                      {row.slope_after_per_week != null ? (
                        formatSlope(row.slope_after_per_week)
                      ) : (
                        <span
                          className="text-gray-400 dark:text-gray-500"
                          title={t("impact.insufficientDetail", { window: windowDays })}
                        >
                          {t("impact.insufficient")}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 pl-3 text-right font-mono ${
                        hasBoth && row.delta_per_week != null
                          ? row.delta_per_week < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {hasBoth && row.delta_per_week != null
                        ? formatSlope(row.delta_per_week)
                        : t("dose.none")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
