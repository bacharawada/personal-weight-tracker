/**
 * PaletteSettings — the "Colour palette" section of the Settings page.
 *
 * Lets the user pick the palette every chart renders with. The choice is
 * stored in `chartParams` and applied at render time, never sent to the API.
 *
 * Renders the full section (heading + card) so the page just drops it in.
 */

import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { PALETTE_NAMES, PALETTE_PREVIEWS, getPaletteAccent } from "../../lib/palettes";

export function PaletteSettings() {
  const { t } = useTranslation("settings");
  const { chartParams, setChartParams } = useWeightTracker();
  const palettes = PALETTE_NAMES;

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("palette.heading")}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
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
                  {t(`palette.names.${name}`, { defaultValue: name })}
                </span>
                {isActive && (
                  <span className="ml-auto text-xs font-medium" style={{ color: getPaletteAccent(chartParams.palette) }}>
                    {t("palette.active")}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
