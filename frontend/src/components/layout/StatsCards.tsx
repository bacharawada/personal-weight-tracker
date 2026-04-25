import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getStats } from "../../lib/api";
import type { Stats } from "../../lib/types";

interface StatsCardsProps {
  refreshKey: number;
}

export function StatsCards({ refreshKey }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    console.log("[StatsCards] fetching — refreshKey:", refreshKey);
    getStats().then(setStats).catch(console.error);
  }, [refreshKey]);

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
          label: "Total Loss",
          value: `${stats.total_loss_kg > 0 ? "-" : "+"}${Math.abs(stats.total_loss_kg).toFixed(1)} kg`,
          color: stats.total_loss_kg > 0 ? "text-green-600" : "text-red-600",
        },
        {
          label: "Avg Loss/Week",
          value: `${stats.avg_loss_per_week >= 0 ? "+" : ""}${stats.avg_loss_per_week.toFixed(2)} kg/wk`,
          color: "text-gray-900 dark:text-gray-100",
        },
        {
          label: "Current Trend",
          value: `${stats.current_trend >= 0 ? "+" : ""}${stats.current_trend.toFixed(2)} kg/wk`,
          color: trendColor,
        },
        {
          label: "Days Tracked",
          value: String(stats.days_tracked),
          color: "text-gray-900 dark:text-gray-100",
        },
        {
          label: "Measurements",
          value: String(stats.measurement_count),
          color: "text-gray-900 dark:text-gray-100",
        },
      ]
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{cards[i].label}</p>
                <p className={`text-xl font-bold ${cards[i].color}`}>{cards[i].value}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
