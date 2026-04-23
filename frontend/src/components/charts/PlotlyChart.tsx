import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

interface PlotlyChartProps {
  fetchFigure: () => Promise<object>;
  refreshKey: number;
  onClick?: (data: Plotly.PlotMouseEvent) => void;
  className?: string;
}

export function PlotlyChart({ fetchFigure, refreshKey, onClick, className = "" }: PlotlyChartProps) {
  const [figure, setFigure] = useState<{ data: Plotly.Data[]; layout: Partial<Plotly.Layout> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFigure()
      .then((fig: any) => {
        setFigure({ data: fig.data || [], layout: fig.layout || {} });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey, fetchFigure]);

  if (loading || !figure) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse h-80 ${className}`} />
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}>
      <Plot
        data={figure.data}
        layout={{
          ...figure.layout,
          autosize: true,
          margin: { l: 60, r: 30, t: 50, b: 40 },
        }}
        config={{ displayModeBar: true, responsive: true }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        onClick={onClick}
      />
    </div>
  );
}
