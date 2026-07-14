import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartPoint } from "../../lib/types";
import { AUTO_AXES } from "../../lib/types";

interface AxisControlsProps {
  axes: ChartAxes;
  onChange: (axes: ChartAxes) => void;
  /** Raw measurements — used to auto-fit the weight axis for a range preset. */
  points: ChartPoint[];
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
 * Build a coherent axis config for a range preset: pin the date window to the
 * last `days` (relative to the latest measurement) and fit the weight axis to
 * the min/max of the points inside that window, padded by ±Y_PADDING.
 * `days === null` means "all time" — date axis stays auto, weight fits all points.
 */
function computePreset(points: ChartPoint[], days: number | null): ChartAxes {
  if (points.length === 0) return AUTO_AXES;

  const latest = points.reduce((max, p) => (p.date > max ? p.date : max), points[0].date);

  let xMin: string | null = null;
  let xMax: string | null = null;
  let inRange = points;

  if (days !== null) {
    xMin = subtractDays(latest, days);
    xMax = latest;
    const filtered = points.filter((p) => p.date >= xMin!);
    if (filtered.length > 0) inRange = filtered;
  }

  const weights = inRange.map((p) => p.value);
  const yMin = Math.floor(Math.min(...weights) - Y_PADDING);
  const yMax = Math.ceil(Math.max(...weights) + Y_PADDING);

  return {
    x: { min: xMin, max: xMax, stepDays: null },
    y: { min: yMin, max: yMax, step: null },
  };
}

const inputClass =
  "w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 " +
  "px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 " +
  "focus:ring-[var(--color-accent)]";
const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1";

/** Manual scale controls for the weight chart: start / end / step on both axes. */
export function AxisControls({ axes, onChange, points }: AxisControlsProps) {
  const { t } = useTranslation("analysis");
  const isCustom =
    JSON.stringify(axes) !== JSON.stringify(AUTO_AXES);
  const activeAxes = JSON.stringify(axes);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("axes.heading")}
        </span>
        {isCustom && (
          <button
            onClick={() => onChange(AUTO_AXES)}
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
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => {
            const presetAxes = computePreset(points, preset.days);
            const isActive =
              points.length > 0 && JSON.stringify(presetAxes) === activeAxes;
            return (
              <button
                key={preset.key}
                disabled={points.length === 0}
                onClick={() => onChange(presetAxes)}
                className={`px-3 py-2 md:py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? "text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                style={isActive ? { backgroundColor: "var(--color-accent)" } : undefined}
              >
                {t(`axes.presetLabels.${preset.key}`)}
              </button>
            );
          })}
        </div>
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
              <input
                type="date"
                value={axes.x.min ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, x: { ...axes.x, min: e.target.value || null } })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.end")}</label>
              <input
                type="date"
                value={axes.x.max ?? ""}
                onChange={(e) =>
                  onChange({ ...axes, x: { ...axes.x, max: e.target.value || null } })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("axes.stepDays")}</label>
              <input
                type="number"
                min={1}
                placeholder={t("axes.autoPlaceholder")}
                value={axes.x.stepDays ?? ""}
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
                value={axes.y.min ?? ""}
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
                value={axes.y.max ?? ""}
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
                value={axes.y.step ?? ""}
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
