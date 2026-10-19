import { useTranslation } from "react-i18next";
import {
  CHART_HEIGHT_MAX,
  CHART_HEIGHT_MIN,
  CHART_HEIGHT_STEP,
} from "../../lib/charts/chartHeight";

interface ChartHeightSliderProps {
  /** Rendered height of the weight chart, in CSS pixels. */
  height: number;
  onHeightChange: (height: number) => void;
}

/** Range slider that sets the weight chart's rendered height. */
export function ChartHeightSlider({ height, onHeightChange }: ChartHeightSliderProps) {
  const { t } = useTranslation("analysis");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("axes.chartHeight")}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {t("axes.chartHeightValue", { value: height })}
        </span>
      </div>
      <input
        type="range"
        min={CHART_HEIGHT_MIN}
        max={CHART_HEIGHT_MAX}
        step={CHART_HEIGHT_STEP}
        value={height}
        aria-label={t("axes.chartHeight")}
        onChange={(event) => onHeightChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer touch-manipulation bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
        style={{ accentColor: "var(--color-accent)" }}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{t("axes.chartHeightValue", { value: CHART_HEIGHT_MIN })}</span>
        <span>{t("axes.chartHeightValue", { value: CHART_HEIGHT_MAX })}</span>
      </div>
      <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {t("axes.chartHeightHint")}
      </p>
    </div>
  );
}
