import { useTranslation } from "react-i18next";
import type { ChartAxes } from "../../lib/types";
import { AUTO_AXES } from "../../lib/types";

interface AxisControlsProps {
  axes: ChartAxes;
  onChange: (axes: ChartAxes) => void;
}

function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const inputClass =
  "w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 " +
  "px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 " +
  "focus:ring-[var(--color-accent)]";
const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1";

/** Manual scale controls for the weight chart: start / end / step on both axes. */
export function AxisControls({ axes, onChange }: AxisControlsProps) {
  const { t } = useTranslation("analysis");
  const isCustom =
    JSON.stringify(axes) !== JSON.stringify(AUTO_AXES);

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
