import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartPoint, EffectiveAxes } from "../../lib/types";
import { DatePicker } from "../ui/date-picker";
import { SegmentedControl } from "../ui/segmented-control";
import { computeRangePreset } from "../../lib/charts/rangePreset";

interface AxisControlsProps {
  axes: ChartAxes;
  onChange: (axes: ChartAxes) => void;
  /** Raw measurements — used to auto-fit the weight axis for a range preset. */
  points: ChartPoint[];
  /** Model projection points — used so a range preset's window still fits the
   * extrapolation horizon (both axes) instead of clipping it. */
  projection: ChartPoint[];
  /**
   * The concrete values the chart currently renders. Fills every field so the
   * controls always reflect the active state, even when an axis is on "auto".
   * Null before the first data load (empty chart) — fields fall back to blank.
   */
  effective: EffectiveAxes | null;
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
export function AxisControls({ axes, onChange, points, projection, effective }: AxisControlsProps) {
  const { t } = useTranslation("analysis");
  // "Auto" is the full-history view: reset returns to the "all" preset (full
  // auto — both axes fit every series, including the projection horizon).
  const allPreset = computeRangePreset(points, projection, null);
  const isCustom = JSON.stringify(axes) !== JSON.stringify(allPreset);
  const activeAxes = JSON.stringify(axes);
  // Which preset the current axes correspond to, if any — manual edits match none.
  const activePreset = points.length === 0
    ? null
    : RANGE_PRESETS.find(
        (preset) => JSON.stringify(computeRangePreset(points, projection, preset.days)) === activeAxes,
      )?.key ?? null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("axes.heading")}
        </span>
        {isCustom && (
          <button
            onClick={() => onChange(allPreset)}
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            {t("axes.resetToAuto")}
          </button>
        )}
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
            if (preset) onChange(computeRangePreset(points, projection, preset.days));
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
    </div>
  );
}
