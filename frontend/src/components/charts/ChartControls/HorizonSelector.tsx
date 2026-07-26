import { useTranslation } from "react-i18next";
import { SegmentedControl, type SegmentedControlOption } from "../../ui/segmented-control";
import { ControlGroup } from "./ControlGroup";
import { HORIZON_OPTIONS } from "./horizonOptions";

interface HorizonSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

/** Projection-horizon group: a segmented control over the fixed horizon presets. */
export function HorizonSelector({ value, onChange }: HorizonSelectorProps) {
  const { t } = useTranslation("analysis");

  const options: SegmentedControlOption<number>[] = HORIZON_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`horizon.${option.unit}`, { count: option.count }),
    shortLabel: t(`horizon.short_${option.unit}`, { count: option.count }),
  }));

  return (
    <ControlGroup label={t("controls.extrapolationHorizon")}>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={t("controls.extrapolationHorizon")}
      />
      <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {t("controls.horizonHint")}
      </p>
    </ControlGroup>
  );
}
