import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartPoint } from "../../lib/types";
import { SegmentedControl } from "../ui/segmented-control";
import { computeRangePreset } from "../../lib/charts/rangePreset";

interface RangePresetsProps {
  axes: ChartAxes;
  onChange: (axes: ChartAxes) => void;
  /** Raw measurements — used to anchor a range preset on the latest one. */
  points: ChartPoint[];
}

const RANGE_PRESETS = [
  { key: "weeks4", days: 28 },
  { key: "months3", days: 90 },
  { key: "months6", days: 180 },
  { key: "all", days: null },
] as const;

/**
 * Smart range presets for the weight chart — pin the date window and auto-fit
 * the weight axis. Shared by the analysis axis controls and the public share page.
 */
export function RangePresets({ axes, onChange, points }: RangePresetsProps) {
  const { t } = useTranslation("analysis");
  const activeAxes = JSON.stringify(axes);
  // Which preset the current axes correspond to, if any — manual edits match none.
  const activePreset = points.length === 0
    ? null
    : RANGE_PRESETS.find(
        (preset) => JSON.stringify(computeRangePreset(points, preset.days)) === activeAxes,
      )?.key ?? null;

  return (
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
  );
}
