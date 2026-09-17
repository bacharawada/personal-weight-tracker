/**
 * MetabolismCard — basal metabolic rate, daily expenditure and implied intake.
 *
 * Three numbers, each depending on the one before:
 *   - BMR from Mifflin-St Jeor (needs weight, height, sex, birth date);
 *   - TDEE = BMR × the chosen activity factor, shown next to the full ladder
 *     so the user can see what a different level would mean;
 *   - implied intake = TDEE + the trend-derived energy balance, i.e. what the
 *     scale says is being eaten, without logging a single meal.
 *
 * Each step degrades to a one-line prompt for what is missing rather than
 * hiding the whole card: the BMR alone is already useful.
 *
 * When the "other" formula variant is chosen the backend returns a BMR band
 * (`bmr_low` / `bmr_high`); the card shows it as a +/- next to the BMR and
 * TDEE so the wider uncertainty is visible where the number is.
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { useMetabolism } from "../../hooks/useMetabolism";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { ACTIVITY_LEVELS, formatKcal } from "../../lib/metabolism";
import type { ActivityLevel, Metabolism } from "../../lib/types";
import { formatWeight } from "../../lib/units";

function MissingInputs({ metabolism }: { metabolism: Metabolism }) {
  const { t } = useTranslation("profile");
  const items = metabolism.missing.map((input) => t(`metabolism.inputs.${input}`));
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {t("metabolism.missing", { items: items.join(", ") })}
    </p>
  );
}

interface LadderProps {
  table: Metabolism["tdee_by_level"];
  active: ActivityLevel | null;
  locale: string;
}

function ActivityLadder({ table, active, locale }: LadderProps) {
  const { t } = useTranslation("profile");
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
      {ACTIVITY_LEVELS.map((level) => {
        const kcal = table[level];
        if (kcal == null) return null;
        const isActive = level === active;
        return (
          <li
            key={level}
            className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-md"
            style={
              isActive
                ? { backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }
                : undefined
            }
          >
            <div className="min-w-0">
              <p
                className={
                  isActive
                    ? "font-semibold text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                }
              >
                {t(`metabolism.activity.${level}.label`)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t(`metabolism.activity.${level}.description`)}
              </p>
            </div>
            <p
              className={`shrink-0 tabular-nums ${
                isActive
                  ? "font-semibold text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {t("metabolism.kcalPerDay", { value: formatKcal(kcal, locale) })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function MetabolismCard() {
  const { t, i18n } = useTranslation("profile");
  const { unit } = useWeightTracker();
  const { metabolism, isLoading, hasLoadError } = useMetabolism();
  const locale = i18n.language;

  let body: ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-gray-500 dark:text-gray-400">{t("metabolism.loading")}</p>;
  } else if (hasLoadError || metabolism == null) {
    body = <p className="text-sm text-red-600 dark:text-red-400">{t("metabolism.loadError")}</p>;
  } else if (!metabolism.has_data || metabolism.bmr_kcal == null) {
    body = <MissingInputs metabolism={metabolism} />;
  } else {
    const { bmr_kcal, bmr_low, bmr_high, tdee_kcal, intake_kcal, intake_low, intake_high } =
      metabolism;
    // Half-width of the variant-choice band; 0 for the two published variants.
    const bmrSpread = bmr_low != null && bmr_high != null ? (bmr_high - bmr_low) / 2 : 0;
    const tdeeSpread =
      metabolism.activity_factor != null ? bmrSpread * metabolism.activity_factor : 0;
    body = (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("metabolism.bmr")}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatKcal(bmr_kcal, locale)}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">
                {t("metabolism.unit")}
              </span>
            </p>
            {bmrSpread > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {t("metabolism.plusMinus", { value: formatKcal(bmrSpread, locale) })}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("metabolism.tdee")}</p>
            {tdee_kcal != null ? (
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--color-accent)" }}
              >
                {formatKcal(tdee_kcal, locale)}
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">
                  {t("metabolism.unit")}
                </span>
                {tdeeSpread > 0 && (
                  <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 tabular-nums">
                    {t("metabolism.plusMinus", { value: formatKcal(tdeeSpread, locale) })}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("metabolism.pickActivity")}
              </p>
            )}
          </div>
        </div>

        <ActivityLadder
          table={metabolism.tdee_by_level}
          active={metabolism.activity_level}
          locale={locale}
        />

        {intake_kcal != null && intake_low != null && intake_high != null ? (
          <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 p-3">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {t("metabolism.intake", { value: formatKcal(intake_kcal, locale) })}
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {t("metabolism.intakeRange", {
                  low: formatKcal(intake_low, locale),
                  high: formatKcal(intake_high, locale),
                })}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("metabolism.intakeHint")}
            </p>
          </div>
        ) : (
          tdee_kcal != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("metabolism.intakeUnavailable")}
            </p>
          )
        )}

        {metabolism.weight_kg != null && metabolism.age_years != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("metabolism.basis", {
              weight: formatWeight(metabolism.weight_kg, unit),
              age: metabolism.age_years,
            })}
            {bmrSpread > 0 && <> {t("metabolism.otherVariantNote")}</>}
          </p>
        )}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Flame size={16} className="text-gray-400" />
        {t("metabolism.heading")}
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t("metabolism.description")}
        </p>
        {body}
      </div>
    </section>
  );
}
