import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { getStats } from "../../lib/api";
import type { Stats } from "../../lib/types";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { kgToDisplay, unitLabel } from "../../lib/units";

interface StatsCardsProps {
  refreshKey: number;
}

export function StatsCards({ refreshKey }: StatsCardsProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    console.log("[StatsCards] fetching — refreshKey:", refreshKey);
    getStats().then(setStats).catch(console.error);
  }, [refreshKey]);

  const u = unitLabel(unit);

  const trendColor =
    !stats || stats.current_trend === 0
      ? "text-gray-500"
      : stats.current_trend < -0.1
        ? "text-green-600"
        : stats.current_trend > 0.1
          ? "text-red-600"
          : "text-gray-500";

  const cards = stats
    ? [
        {
          label: t("stats.totalLoss"),
          value: `${stats.total_loss_kg > 0 ? "-" : "+"}${kgToDisplay(Math.abs(stats.total_loss_kg), unit).toFixed(1)} ${u}`,
          color: stats.total_loss_kg > 0 ? "text-green-600" : "text-red-600",
        },
        {
          label: t("stats.avgLossPerWeek"),
          value: `${stats.avg_loss_per_week >= 0 ? "+" : ""}${kgToDisplay(stats.avg_loss_per_week, unit).toFixed(2)} ${u}/wk`,
          color: "text-gray-900 dark:text-gray-100",
        },
        {
          label: t("stats.currentTrend"),
          value: `${stats.current_trend >= 0 ? "+" : ""}${kgToDisplay(stats.current_trend, unit).toFixed(2)} ${u}/wk`,
          color: trendColor,
        },
        {
          label: t("stats.daysTracked"),
          value: String(stats.days_tracked),
          color: "text-gray-900 dark:text-gray-100",
        },
        {
          label: t("stats.measurements"),
          value: String(stats.measurement_count),
          color: "text-gray-900 dark:text-gray-100",
        },
      ]
    : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center overflow-hidden h-20"
        >
          {/* Shimmer skeleton while loading */}
          <AnimatePresence>
            {!cards && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 rounded-lg overflow-hidden"
              >
                {/* shimmer sweep */}
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real content fades in */}
          <AnimatePresence>
            {cards && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-tight">{cards[i].label}</p>
                <p className={`text-base md:text-xl font-bold leading-tight mt-0.5 ${cards[i].color}`}>{cards[i].value}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
