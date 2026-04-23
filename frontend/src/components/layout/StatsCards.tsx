import { useEffect, useState } from "react";
import { getStats } from "../../lib/api";
import type { Stats } from "../../lib/types";

interface StatsCardsProps {
  refreshKey: number;
}

export function StatsCards({ refreshKey }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, [refreshKey]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const trendColor =
    stats.current_trend < -0.1
      ? "text-green-600"
      : stats.current_trend > 0.1
        ? "text-red-600"
        : "text-gray-500";

  const cards = [
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
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
