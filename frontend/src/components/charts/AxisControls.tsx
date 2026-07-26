import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartPoint, EffectiveAxes } from "../../lib/types";
import { DatePicker } from "../ui/date-picker";
import { SegmentedControl } from "../ui/segmented-control";
import { computeRangePreset } from "../../lib/charts/rangePreset";
import {
  CHART_HEIGHT_MAX,
  CHART_HEIGHT_MIN,
  CHART_HEIGHT_STEP,
  defaultChartHeight,
} from "../../lib/charts/chartHeight";

interface AxisControlsProps {
  axes: ChartAxes;
  onChange: (axes: ChartAxes) => void;
  /** Raw measurements — used to anchor a range preset on the latest one. */
  points: ChartPoint[];
  /**
   * The concrete values the chart currently renders. Fills every field so the
   * controls always reflect the active state, even when an axis is on "auto".
   * Null before the first data load (empty chart) — fields fall back to blank.
   */
  effective: EffectiveAxes | null;
  /** Rendered height of the weight chart, in CSS pixels. */
  height: number;
  onHeightChange: (height: number) => void;
}

function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const RANGE_PRESETS = [
  { key: "weeks4", days: 28 },
  { key: "months3", days: 90 },
  { key: "months6", days: 180 },
  { key: "all", days: null },
] as const;

const inputClass =
  "w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 " +
  "px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 " +
  "focus:ring-[var(--color-accent)]";
const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1";

/** Manual scale controls for the weight chart: start / end / step on both axes. */
export function AxisControls({
  axes,
  onChange,
  points,
  effective,
  height,
  onHeightChange,
}: AxisControlsProps) {
  const { t } = useTranslation("analysis");
  // "Auto" is the full-history view: reset returns to the "all" preset (full
  // auto — both axes fit every series, including the projection horizon).
  const allPreset = computeRangePreset(points, null);
  const autoHeight = defaultChartHeight();
  const isCustom =
    JSON.stringify(axes) !== JSON.stringify(allPreset) || height !== autoHeight;
  const activeAxes = JSON.stringify(axes);
  // Which preset the current axes correspond to, if any — manual edits match none.
  const activePreset = points.length === 0
    ? null
    : RANGE_PRESETS.find(
        (preset) => JSON.stringify(computeRangePreset(points, preset.days)) === activeAxes,
      )?.key ?? null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("axes.heading")}
        </span>
        {/* Kept in place and disabled when the axes are already auto, so the
            heading row never reflows as the user edits a field. */}
        <button
          disabled={!isCustom}
          onClick={() => {
            onChange(allPreset);
            onHeightChange(autoHeight);
          }}
          className="text-xs font-medium text-[var(--color-accent)] enabled:hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
        >
          {t("axes.resetToAuto")}
        </button>
      </div>

      {/* Smart range presets — pin the date window and auto-fit the weight axis. */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          {t("axes.presets")}
        </p>
        <SegmentedControl
          options={RANGE_PRESETS.map((preset) => ({
            value: preset.key,
            label: t(`axes.presetLabels.${preset.key}`),
            shortLabel: t(`axes.presetShortLabels.${preset.key}`),
            disabled: points.length === 0,
          }))}
          value={activePreset}
          onChange={(key) => {
            const preset = RANGE_PRESETS.find((candidate) => candidate.key === key);
            if (preset) onChange(computeRangePreset(points, preset.days));
          }}
          ariaLabel={t("axes.presets")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* X axis (dates) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {t("axes.dateAxis")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t("axes.start")}</label>
              <DatePicker
                value={effective?.x.min ?? null}
                onChange={(v) => onChange({ ...axes, x: { ...axes.x, min: v } })}
                clearable
                className="h-[30px] px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.end")}</label>
              <DatePicker
                value={effective?.x.max ?? null}
                onChange={(v) => onChange({ ...axes, x: { ...axes.x, max: v } })}
                clearable
                className="h-[30px] px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.stepDays")}</label>
              <input
                type="number"
                min={1}
                placeholder={t("axes.autoPlaceholder")}
                value={effective?.x.stepDays ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, x: { ...axes.x, stepDays: parseNum(e.target.value) } })
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Y axis (weight) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {t("axes.weightAxis")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t("axes.min")}</label>
              <input
                type="number"
                placeholder={t("axes.autoPlaceholder")}
                value={effective?.y.min ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, y: { ...axes.y, min: parseNum(e.target.value) } })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.max")}</label>
              <input
                type="number"
                placeholder={t("axes.autoPlaceholder")}
                value={effective?.y.max ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, y: { ...axes.y, max: parseNum(e.target.value) } })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.step")}</label>
              <input
                type="number"
                min={0}
                placeholder={t("axes.autoPlaceholder")}
                value={effective?.y.step ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, y: { ...axes.y, step: parseNum(e.target.value) } })
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plot height. Not an axis domain, but the other half of the same problem:
          a fine weight step only reads as "airy" if the frame has the pixels to
          spread those gridlines over. */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
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
    </div>
  );
}
