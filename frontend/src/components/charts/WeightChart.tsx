import { useCallback } from "react";
import { getWeightChart } from "../../lib/api";
import type { ChartParams } from "../../lib/types";
import { PlotlyChart } from "./PlotlyChart";

interface WeightChartProps {
  params: ChartParams;
  refreshKey: number;
  onPointClick: (point: { date: string; weight: number }) => void;
}

export function WeightChart({ params, refreshKey, onPointClick }: WeightChartProps) {
  const fetchFigure = useCallback(() => getWeightChart(params), [params]);

  function handleClick(event: Plotly.PlotMouseEvent) {
    if (event.points.length > 0) {
      const pt = event.points[0];
      onPointClick({
        date: String(pt.x).slice(0, 10),
        weight: Number(pt.y),
      });
    }
  }

  return (
    <PlotlyChart
      fetchFigure={fetchFigure}
      refreshKey={refreshKey}
      onClick={handleClick}
      className="h-[420px]"
    />
  );
}
