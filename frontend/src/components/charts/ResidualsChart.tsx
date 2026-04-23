import { useCallback } from "react";
import { getResidualsChart } from "../../lib/api";
import type { ChartParams } from "../../lib/types";
import { PlotlyChart } from "./PlotlyChart";

interface ResidualsChartProps {
  params: ChartParams;
  refreshKey: number;
}

export function ResidualsChart({ params, refreshKey }: ResidualsChartProps) {
  const fetchFigure = useCallback(() => getResidualsChart(params), [params]);

  return (
    <PlotlyChart
      fetchFigure={fetchFigure}
      refreshKey={refreshKey}
      className="h-[300px]"
    />
  );
}
