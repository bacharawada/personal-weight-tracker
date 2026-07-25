/**
 * DisplayFormatSettings — the "Units & formats" section of the Settings page.
 *
 * Groups the three preferences that change how stored values are *rendered*
 * without changing the values themselves: the weight unit (storage stays kg)
 * and the date order / separator (storage stays ISO). Each control saves
 * immediately; there is no Save button.
 *
 * Renders the full section (heading + card) so the page just drops it in.
 */

import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { formatSample } from "../../lib/dates";
import { DateOrder, DateSeparator, WeightUnit } from "../../lib/types";
import { unitLabel } from "../../lib/units";

const DATE_ORDERS = [
  { value: DateOrder.Dmy, labelKey: "unitsFormats.dateOrder.european" },
  { value: DateOrder.Mdy, labelKey: "unitsFormats.dateOrder.american" },
  { value: DateOrder.Ymd, labelKey: "unitsFormats.dateOrder.iso" },
] as const;

const SEPARATORS = [DateSeparator.Slash, DateSeparator.Dash] as const;

export function DisplayFormatSettings() {
  const { t } = useTranslation("settings");
  const { profile, unit, saveProfile } = useWeightTracker();

  const dateOrder = profile?.date_order ?? DateOrder.Dmy;
  const dateSeparator = profile?.date_separator ?? DateSeparator.Slash;
  // The ISO order always renders with a dash, so the separator choice has no
  // effect while it is selected.
  const isSeparatorDisabled = dateOrder === DateOrder.Ymd;

  async function handleUnitChange(next: WeightUnit) {
    if (next === unit) return;
    await saveProfile({ unit_preference: next });
  }

  async function handleOrderChange(next: DateOrder) {
    if (next === dateOrder) return;
    await saveProfile({ date_order: next });
  }

  async function handleSeparatorChange(next: DateSeparator) {
    if (next === dateSeparator) return;
    await saveProfile({ date_separator: next });
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        {t("unitsFormats.heading")}
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-5">
        {/* Weight unit */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("unitsFormats.unit.label")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("unitsFormats.unit.helper")}
            </p>
          </div>
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            {[WeightUnit.Kg, WeightUnit.Lb].map((option) => {
              const isActive = unit === option;
              return (
                <button
                  key={option}
                  onClick={() => handleUnitChange(option)}
                  className={`px-3 py-3 md:py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  style={isActive ? { backgroundColor: "var(--color-accent)" } : undefined}
                >
                  {unitLabel(option)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        {/* Date order — each option previews itself with the current separator */}
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("unitsFormats.dateOrder.label")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("unitsFormats.dateOrder.helper")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DATE_ORDERS.map(({ value, labelKey }) => {
              const isActive = dateOrder === value;
              return (
                <button
                  key={value}
                  onClick={() => handleOrderChange(value)}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t(labelKey)}
                  </span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {formatSample(value, dateSeparator)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className={`text-sm font-medium ${
                isSeparatorDisabled
                  ? "text-gray-400 dark:text-gray-500"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {t("unitsFormats.separator.label")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isSeparatorDisabled
                ? t("unitsFormats.separator.isoHelper")
                : t("unitsFormats.separator.helper")}
            </p>
          </div>
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            {SEPARATORS.map((option) => {
              const isActive = dateSeparator === option;
              return (
                <button
                  key={option}
                  onClick={() => handleSeparatorChange(option)}
                  disabled={isSeparatorDisabled}
                  className={`px-4 py-3 md:py-1.5 text-sm font-mono font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive && !isSeparatorDisabled
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-300 enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-700/50"
                  }`}
                  style={
                    isActive && !isSeparatorDisabled
                      ? { backgroundColor: "var(--color-accent)" }
                      : undefined
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
