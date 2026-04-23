import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "./components/layout/Navbar";
import { StatsCards } from "./components/layout/StatsCards";
import { Sidebar } from "./components/layout/Sidebar";
import { WeightChart } from "./components/charts/WeightChart";
import { DerivativeChart } from "./components/charts/DerivativeChart";
import { ResidualsChart } from "./components/charts/ResidualsChart";
import { useTheme } from "./hooks/useTheme";
import { usePolling } from "./hooks/usePolling";
import { getMeasurements } from "./lib/api";
import type { ChartParams } from "./lib/types";

export default function App() {
  const { isDark, toggle } = useTheme();
  const { refreshKey, bump } = usePolling();

  const [selectedPoint, setSelectedPoint] = useState<{ date: string; weight: number } | null>(null);
  const [hasData, setHasData] = useState(false);

  const [chartParams, setChartParams] = useState<ChartParams>({
    smoothing: 5,
    horizon: 56,
    palette: "Classic",
    dark: isDark,
  });

  // Keep dark in sync with theme toggle.
  useEffect(() => {
    setChartParams((prev) => ({ ...prev, dark: isDark }));
  }, [isDark]);

  // Check if data exists (for disabling export buttons).
  useEffect(() => {
    getMeasurements()
      .then((m) => setHasData(m.length > 0))
      .catch(() => setHasData(false));
  }, [refreshKey]);

  const handlePointClick = useCallback((point: { date: string; weight: number }) => {
    setSelectedPoint(point);
  }, []);

  const handleDataChange = useCallback(() => {
    bump();
  }, [bump]);

  const handleClearSelection = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  // Memoize the combined key so charts re-fetch when params or data change.
  const chartRefreshKey = useMemo(
    () => `${refreshKey}-${JSON.stringify(chartParams)}`,
    [refreshKey, chartParams]
  );

  // Use a numeric key for PlotlyChart.
  const numericRefreshKey = useMemo(() => {
    let hash = 0;
    for (const ch of chartRefreshKey) {
      hash = (hash << 5) - hash + ch.charCodeAt(0);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [chartRefreshKey]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar isDark={isDark} onToggleTheme={toggle} />

      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <StatsCards refreshKey={refreshKey} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Charts — 9 columns */}
          <div className="lg:col-span-9 space-y-4">
            <WeightChart
              params={chartParams}
              refreshKey={numericRefreshKey}
              onPointClick={handlePointClick}
            />
            <DerivativeChart
              params={chartParams}
              refreshKey={numericRefreshKey}
            />
            <ResidualsChart
              params={chartParams}
              refreshKey={numericRefreshKey}
            />
          </div>

          {/* Sidebar — 3 columns */}
          <div className="lg:col-span-3">
            <Sidebar
              chartParams={chartParams}
              onParamsChange={setChartParams}
              selectedPoint={selectedPoint}
              onDataChange={handleDataChange}
              onClearSelection={handleClearSelection}
              hasData={hasData}
            />
          </div>
        </div>

        <footer className="text-center text-sm text-gray-400 dark:text-gray-600 mt-8 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
          Weight Tracker — Interactive body weight analysis
        </footer>
      </main>
    </div>
  );
}
