/**
 * MetabolismTile — daily energy expenditure at a glance.
 *
 * The headline is the TDEE when an activity level is set, otherwise the BMR
 * with a nudge to pick one. The implied intake (TDEE + trend-derived balance)
 * closes the loop with the energy tile beside it: one says how far from
 * maintenance the scale says you are, this one says what that means in
 * calories eaten. The full ladder lives on the profile page.
 */

import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { formatKcal } from "../../lib/metabolism";
import type { Metabolism } from "../../lib/types";
import { Tile } from "./tiles";

interface MetabolismTileProps {
  metabolism: Metabolism | null;
}

export function MetabolismTile({ metabolism }: MetabolismTileProps) {
  const { t, i18n } = useTranslation("dashboard");
  const locale = i18n.language;

  if (metabolism == null || !metabolism.has_data || metabolism.bmr_kcal == null) {
    return (
      <Tile label={t("metabolism.label")} icon={<Gauge size={16} />}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("metabolism.unavailable")}
        </p>
      </Tile>
    );
  }

  const { bmr_kcal, tdee_kcal, intake_kcal, intake_low, intake_high } = metabolism;
  const headline = tdee_kcal ?? bmr_kcal;

  return (
    <Tile label={t("metabolism.label")} icon={<Gauge size={16} />}>
      <p className="text-xl font-bold leading-tight mt-2 text-gray-900 dark:text-gray-100 tabular-nums">
        {formatKcal(headline, locale)}
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">
          {t("metabolism.unit")}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {tdee_kcal != null
          ? t("metabolism.bmr", { value: formatKcal(bmr_kcal, locale) })
          : t("metabolism.pickActivity")}
      </p>

      {intake_kcal != null && intake_low != null && intake_high != null && (
        <div className="mt-3">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {t("metabolism.intake", { value: formatKcal(intake_kcal, locale) })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("metabolism.intakeRange", {
              low: formatKcal(intake_low, locale),
              high: formatKcal(intake_high, locale),
            })}
          </p>
        </div>
      )}
    </Tile>
  );
}
