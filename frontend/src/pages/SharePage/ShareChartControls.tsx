import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartParams, ChartPoint } from "../../lib/types";
import { Card } from "../../components/ui/card";
import { RangePresets } from "../../components/charts/RangePresets";
import { SeriesToggles } from "../../components/charts/ChartControls";
import { ChartHeightSlider } from "../../components/charts/ChartHeightSlider";

interface ShareChartControlsProps {
  params: ChartParams;
  onParamsChange: (params: ChartParams) => void;
  axes: ChartAxes;
  onAxesChange: (axes: ChartAxes) => void;
  /** Raw measurements — anchor the range presets on the latest one. */
  points: ChartPoint[];
  /** Rendered height of the weight chart, in CSS pixels. */
  height: number;
  onHeightChange: (height: number) => void;
}

/**
 * The visitor's light chart controls: quick date ranges, which series are
 * plotted and the chart height. Smoothing, horizon and manual axes stay on the
 * analysis defaults — the share page is a view, not a workbench.
 */
export function ShareChartControls({
  params,
  onParamsChange,
  axes,
  onAxesChange,
  points,
  height,
  onHeightChange,
}: ShareChartControlsProps) {
  const { t } = useTranslation("analysis");

  return (
    <Card className="p-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          {t("axes.presets")}
        </p>
        <RangePresets axes={axes} onChange={onAxesChange} points={points} />
      </div>
      <SeriesToggles params={params} onChange={onParamsChange} hasDosesToggle={false} />
      <div className="border-t border-gray-100 pt-4 dark:border-gray-700 md:col-span-2">
        <ChartHeightSlider height={height} onHeightChange={onHeightChange} />
      </div>
    </Card>
  );
}
