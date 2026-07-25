/**
 * EnergyTile — the estimated daily energy balance, and which way it is moving.
 *
 * The headline number came from the panel this replaces; the sparkline is new
 * and answers the question the number alone cannot: is the deficit deepening or
 * eroding?
 *
 * Deliberately absent: a "cumulative fat lost" translation. The balance is
 * derived *from* the weight trend (slope × 7700 kcal/kg), so converting it back
 * into kilograms would restate the weight already lost as if it were an
 * independent finding.
 */

import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import type { EnergyBalance, EnergyPoint } from "../../lib/types";
import { Sparkline, Tile } from "./tiles";

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

interface EnergyTileProps {
  energy: EnergyBalance | null;
  /** Per-measurement balance series, for the shape of the trend. */
  series: EnergyPoint[];
}

export function EnergyTile({ energy, series }: EnergyTileProps) {
  const { t } = useTranslation("dashboard");

  const balance = energy?.balance_kcal_day ?? null;
  const hasEstimate = energy?.has_data === true && balance !== null;

  if (!hasEstimate || balance === null) {
    return (
      <Tile label={t("energy.label")} icon={<Flame size={16} />}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("energy.insufficient")}
        </p>
      </Tile>
    );
  }

  const magnitude = Math.abs(roundKcal(balance));
  const isMaintenance = magnitude < MAINTENANCE_THRESHOLD_KCAL;
  const valueText = isMaintenance
    ? t("energy.maintenance")
    : balance < 0
      ? t("energy.deficit", { value: magnitude })
      : t("energy.surplus", { value: magnitude });
  const valueColor = isMaintenance
    ? "text-gray-500 dark:text-gray-400"
    : balance < 0
      ? "text-green-600"
      : "text-red-600";

  const low = energy?.balance_low ?? null;
  const high = energy?.balance_high ?? null;

  return (
    <Tile label={t("energy.label")} icon={<Flame size={16} />}>
      <p className={`text-xl font-bold leading-tight mt-2 ${valueColor}`}>
        {valueText}
      </p>
      {low !== null && high !== null && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t("energy.range", { low: formatSigned(low), high: formatSigned(high) })}
        </p>
      )}

      <div className="mt-3">
        <Sparkline
          values={series.map((point) => point.kcal)}
          ariaLabel={t("energy.sparklineLabel")}
        />
      </div>

      {energy?.window_days != null && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t("energy.window", { count: energy.window_days })}
        </p>
      )}
    </Tile>
  );
}
