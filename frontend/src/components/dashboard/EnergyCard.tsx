/**
 * EnergyCard — dashboard panel showing the estimated daily energy balance.
 *
 * Reads the server-side estimate (/api/stats/energy), derived from the recent
 * weight trend, and renders a headline deficit/surplus in kcal/day (coloured
 * green for a deficit, red for a surplus) with the confidence range beneath.
 * When there is too little data it shows a quiet prompt.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { getEnergyBalance } from "../../lib/api";
import type { EnergyBalance } from "../../lib/types";

interface EnergyCardProps {
  refreshKey: number;
}

/** kcal below which the trend is treated as roughly at maintenance. */
const MAINTENANCE_THRESHOLD_KCAL = 50;

/** Round a signed kcal/day value to the nearest 10 for display. */
function roundKcal(value: number): number {
  return Math.round(value / 10) * 10;
}

/** Format a signed kcal/day bound with an explicit sign. */
function formatSigned(value: number): string {
  const rounded = roundKcal(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function EnergyCard({ refreshKey }: EnergyCardProps) {
  const { t } = useTranslation("dashboard");
  const [energy, setEnergy] = useState<EnergyBalance | null>(null);

  useEffect(() => {
    getEnergyBalance().then(setEnergy).catch(console.error);
  }, [refreshKey]);

  const balance = energy?.balance_kcal_day ?? null;
  const low = energy?.balance_low ?? null;
  const high = energy?.balance_high ?? null;

  let valueText = "";
  let valueColor = "text-gray-500";
  if (energy?.has_data === true && balance !== null) {
    const magnitude = Math.abs(roundKcal(balance));
    if (magnitude < MAINTENANCE_THRESHOLD_KCAL) {
      valueText = t("energy.maintenance");
      valueColor = "text-gray-500";
    } else if (balance < 0) {
      valueText = t("energy.deficit", { value: magnitude });
      valueColor = "text-green-600";
    } else {
      valueText = t("energy.surplus", { value: magnitude });
      valueColor = "text-red-600";
    }
  }

  const hasEstimate = energy?.has_data === true && balance !== null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
      <Flame size={20} className="shrink-0 mt-0.5 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("energy.label")}</p>
        {hasEstimate ? (
          <>
            <p className={`text-xl font-bold leading-tight mt-0.5 ${valueColor}`}>{valueText}</p>
            {low !== null && high !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("energy.range", { low: formatSigned(low), high: formatSigned(high) })}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("energy.insufficient")}
          </p>
        )}
      </div>
    </div>
  );
}
