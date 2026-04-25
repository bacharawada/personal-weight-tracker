import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { Spinner } from "../components/ui/Spinner";
import { getPalettes, exportPngUrl } from "../lib/api";
import { getPaletteAccent } from "../lib/palette";
import { Download, Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/button";

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
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-2xl">
      <PageTitle title="Settings" subtitle="Customize the appearance and export your data" />

      {/* Theme */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Appearance</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Currently: {isDark ? "Dark" : "Light"}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme} className="shrink-0">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              Switch to {isDark ? "Light" : "Dark"}
            </Button>
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
                  className={`flex items-center gap-3 p-3 min-h-[52px] rounded-lg border-2 text-left transition-colors ${
                    isActive
                      ? ""
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  style={isActive ? {
                    borderColor: getPaletteAccent(name),
                    backgroundColor: `${getPaletteAccent(name)}18`,
                  } : undefined}
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
                    <span className="ml-auto text-xs font-medium" style={{ color: getPaletteAccent(chartParams.palette) }}>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Weight Chart</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                PNG, 1200×700, with current palette and settings
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild={hasData} disabled={!hasData}>
              {hasData ? (
                <a href={exportPngUrl(chartParams)} download="weight_chart.png">
                  <Download size={16} /> Export PNG
                </a>
              ) : (
                <span><Download size={16} /> Export PNG</span>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
