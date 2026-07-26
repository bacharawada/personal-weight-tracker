import { useTranslation } from "react-i18next";
import { ControlGroup } from "./ControlGroup";

/** Bounds of the centred rolling-mean window, in measurements. */
const SMOOTHING_MIN = 3;
const SMOOTHING_MAX = 10;

interface SmoothingSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** The window only feeds the rolling mean, so it is dead while that line is hidden. */
  disabled: boolean;
}

/** Smoothing-window group: slider, live value badge, and what the trade-off is. */
export function SmoothingSlider({ value, onChange, disabled }: SmoothingSliderProps) {
  const { t } = useTranslation("analysis");

  return (
    <ControlGroup
      label={t("controls.smoothingWindow")}
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            disabled
              ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "text-white"
          }`}
          style={disabled ? undefined : { backgroundColor: "var(--color-accent)" }}
        >
          {t("controls.smoothingValue", { count: value })}
        </span>
      }
    >
      <input
        type="range"
        min={SMOOTHING_MIN}
        max={SMOOTHING_MAX}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={t("controls.smoothingWindow")}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer touch-manipulation bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-gray-900"
        style={{ accentColor: disabled ? "#9CA3AF" : "var(--color-accent)" }}
      />
      <div
        className={`flex justify-between text-xs text-gray-400 ${disabled ? "opacity-40" : ""}`}
      >
        <span>{SMOOTHING_MIN}</span>
        <span>{SMOOTHING_MAX}</span>
      </div>
      <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {disabled ? t("controls.smoothingNeedsRollingMean") : t("controls.smoothingHint")}
      </p>
    </ControlGroup>
  );
}
