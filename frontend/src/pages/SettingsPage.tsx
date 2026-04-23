import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { Spinner } from "../components/ui/Spinner";
import { getPalettes, exportPngUrl } from "../lib/api";
import { Download, Moon, Sun } from "lucide-react";

const PALETTE_PREVIEWS: Record<string, string[]> = {
  Classic:    ["#2E6DB4", "#C97A0A", "#2CA02C"],
  Teal:       ["#00897B", "#26A69A", "#004D40"],
  Warm:       ["#E65100", "#FF8F00", "#BF360C"],
  Monochrome: ["#424242", "#757575", "#1565C0"],
  Forest:     ["#2E7D32", "#558B2F", "#33691E"],
};

export function SettingsPage() {
  const { isDark, toggleTheme, chartParams, setChartParams, hasData } = useWeightTracker();
  const [palettes, setPalettes] = useState<string[]>([]);

  useEffect(() => {
    getPalettes().then((p) => setPalettes(p.names)).catch(console.error);
  }, []);

  return (
    <PageTransition>
    <div className="p-6 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize the appearance and export your data
        </p>
      </div>

      {/* Theme */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Appearance</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Currently: {isDark ? "Dark" : "Light"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              Switch to {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </section>

      {/* Colour palette */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Colour Palette</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <AnimatePresence mode="wait">
          {palettes.length === 0 ? (
            <motion.div
              key="palette-loading"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-6"
            >
              <Spinner size={24} />
            </motion.div>
          ) : (
          <motion.div
            key="palette-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {palettes.map((name) => {
              const swatches = PALETTE_PREVIEWS[name] ?? ["#888", "#aaa", "#ccc"];
              const isActive = chartParams.palette === name;
              return (
                <button
                  key={name}
                  onClick={() => setChartParams({ ...chartParams, palette: name })}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex gap-1">
                    {swatches.map((color) => (
                      <div
                        key={color}
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {name}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
          )}
          </AnimatePresence>
        </div>
      </section>

      {/* Export */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Export</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Weight Chart</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                PNG, 1200×700, with current palette and settings
              </p>
            </div>
            <a
              href={hasData ? exportPngUrl(chartParams) : undefined}
              download="weight_chart.png"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasData
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-400 pointer-events-none"
              }`}
            >
              <Download size={16} /> Export PNG
            </a>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
