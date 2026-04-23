import { useCallback } from "react";
import { getDerivativeChart } from "../../lib/api";
import type { ChartParams } from "../../lib/types";
import { PlotlyChart } from "./PlotlyChart";

interface DerivativeChartProps {
  params: ChartParams;
  refreshKey: number;
}

export function DerivativeChart({ params, refreshKey }: DerivativeChartProps) {
  const fetchFigure = useCallback(() => getDerivativeChart(params), [params]);

  return (
    <PlotlyChart
      fetchFigure={fetchFigure}
      refreshKey={refreshKey}
      className="h-[300px]"
    />
  );
}
