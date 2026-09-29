import { useTranslation } from "react-i18next";
import type { ChartAxes, ChartParams, ChartPoint } from "../../lib/types";
import { Card } from "../../components/ui/card";
import { RangePresets } from "../../components/charts/RangePresets";
import { SeriesToggles } from "../../components/charts/ChartControls";

interface ShareChartControlsProps {
  params: ChartParams;
  onParamsChange: (params: ChartParams) => void;
  axes: ChartAxes;
  onAxesChange: (axes: ChartAxes) => void;
  /** Raw measurements — anchor the range presets on the latest one. */
  points: ChartPoint[];
}

/**
 * The visitor's light chart controls: quick date ranges and which series are
 * plotted. Smoothing, horizon and manual axes stay on the analysis defaults —
 * the share page is a view, not a workbench.
 */
export function ShareChartControls({
  params,
  onParamsChange,
  axes,
  onAxesChange,
  points,
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
    </Card>
  );
}
