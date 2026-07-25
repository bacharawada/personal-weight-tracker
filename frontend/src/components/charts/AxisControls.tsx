import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartPoint, EffectiveAxes } from "../../lib/types";
import { AUTO_AXES } from "../../lib/types";
import { DatePicker } from "../ui/date-picker";
import { SegmentedControl } from "../ui/segmented-control";

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

/** Padding (in axis units) added below/above the period's extremes for a coherent zoom. */
const Y_PADDING = 5;

const RANGE_PRESETS = [
  { key: "weeks4", days: 28 },
  { key: "months3", days: 90 },
  { key: "months6", days: 180 },
  { key: "all", days: null },
] as const;

/** Shift an ISO date (YYYY-MM-DD) back by `days`, staying in UTC to avoid TZ drift. */
function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a coherent axis config for a range preset.
 *
 * `days === null` ("all history") is full auto — both axes fit every plotted
 * series reactively, so the extrapolation horizon is always visible without
 * pinning anything.
 *
 * For a fixed range, only the *start* of the date window is pinned (`days` back
 * from the latest measurement); the date axis end stays auto so the projection
 * is never clipped horizontally. The weight axis is fitted to every point in the
 * window — raw measurements *and* the projection — padded by ±Y_PADDING, so the
 * horizon stays on-screen vertically too.
 */
function computePreset(
  points: ChartPoint[],
  projection: ChartPoint[],
  days: number | null,
): ChartAxes {
  if (days === null || points.length === 0) return AUTO_AXES;

  const latest = points.reduce((max, p) => (p.date > max ? p.date : max), points[0].date);
  const xMin = subtractDays(latest, days);

  const weights = [...points, ...projection]
    .filter((p) => p.date >= xMin)
    .map((p) => p.value);
  const yMin = Math.floor(Math.min(...weights) - Y_PADDING);
  const yMax = Math.ceil(Math.max(...weights) + Y_PADDING);

  return {
    x: { min: xMin, max: null, stepDays: null },
    y: { min: yMin, max: yMax, step: null },
  };
}

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
  const allPreset = computePreset(points, projection, null);
  const isCustom = JSON.stringify(axes) !== JSON.stringify(allPreset);
  const activeAxes = JSON.stringify(axes);
  // Which preset the current axes correspond to, if any — manual edits match none.
  const activePreset = points.length === 0
    ? null
    : RANGE_PRESETS.find(
        (preset) => JSON.stringify(computePreset(points, projection, preset.days)) === activeAxes,
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
            if (preset) onChange(computePreset(points, projection, preset.days));
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
