import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { DEFAULT_CHART_CONTROLS, type ChartParams } from "../../../lib/types";
import { HorizonSelector } from "./HorizonSelector";
import { getHorizonI18n } from "./horizonOptions";
import { SeriesToggles } from "./SeriesToggles";
import { SmoothingSlider } from "./SmoothingSlider";

interface ChartControlsProps {
  params: ChartParams;
  onChange: (params: ChartParams) => void;
}

/** Mirrors Tailwind's `md` breakpoint — the panel starts open from there up. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** True when every control still holds its factory default (hides the reset link). */
function isDefaultControls(params: ChartParams): boolean {
  return (
    params.smoothing === DEFAULT_CHART_CONTROLS.smoothing &&
    params.horizon === DEFAULT_CHART_CONTROLS.horizon &&
    params.showSmoothed === DEFAULT_CHART_CONTROLS.showSmoothed &&
    params.showExp === DEFAULT_CHART_CONTROLS.showExp &&
    params.showLinear === DEFAULT_CHART_CONTROLS.showLinear &&
    params.showBand === DEFAULT_CHART_CONTROLS.showBand &&
    params.showDoses === DEFAULT_CHART_CONTROLS.showDoses
  );
}

/**
 * Chart controls for the Analysis page: smoothing window, projection horizon and
 * which series are plotted.
 *
 * The panel is collapsible and starts closed below `md`, where three groups of
 * controls would otherwise push the chart off-screen; the header keeps a one-line
 * summary of the active settings so nothing is hidden without a trace.
 */
export function ChartControls({ params, onChange }: ChartControlsProps) {
  const { t } = useTranslation("analysis");
  const [isOpen, setIsOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  const horizon = getHorizonI18n(params.horizon);
  const seriesCount = [
    params.showSmoothed,
    params.showExp,
    params.showLinear,
    params.showBand,
    params.showDoses,
  ].filter(Boolean).length;

  const summary = [
    t("controls.summarySmoothing", { count: params.smoothing }),
    params.horizon === 0
      ? t("controls.summaryNoProjection")
      : t("controls.summaryProjection", { horizon: t(horizon.key, { count: horizon.count }) }),
    t("controls.summarySeries", { count: seriesCount }),
  ].join(" · ");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="chart-controls-body"
        className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
          isOpen ? "rounded-t-lg" : "rounded-lg"
        }`}
      >
        <SlidersHorizontal size={15} className="shrink-0 text-gray-400" />
        <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-200">
          {t("controls.heading")}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-gray-400 dark:text-gray-500">
          {summary}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="chart-controls-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {!isDefaultControls(params) && (
              <div className="flex justify-end px-4 pb-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...params, ...DEFAULT_CHART_CONTROLS })}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  {t("controls.reset")}
                </button>
              </div>
            )}

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
              <SmoothingSlider
                value={params.smoothing}
                onChange={(smoothing) => onChange({ ...params, smoothing })}
              />
              <HorizonSelector
                value={params.horizon}
                onChange={(horizonDays) => onChange({ ...params, horizon: horizonDays })}
              />
              <SeriesToggles params={params} onChange={onChange} className="md:col-span-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
