import { useEffect, useRef, useState } from "react";
import { Plotly } from "../../lib/PlotlyFactory";

interface PlotlyChartProps {
  fetchFigure: () => Promise<object>;
  refreshKey: number;
  onClick?: (event: Plotly.PlotMouseEvent) => void;
  className?: string;
}

export function PlotlyChart({
  fetchFigure,
  refreshKey,
  onClick,
  className = "",
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);

    fetchFigure()
      .then((fig: any) => {
        if (!containerRef.current) return;

        Plotly.react(
          containerRef.current,
          fig.data ?? [],
          {
            ...(fig.layout ?? {}),
            autosize: true,
            margin: { l: 60, r: 30, t: 50, b: 40 },
          },
          { responsive: true, displayModeBar: true }
        ).then((gd) => {
          if (onClick) {
            gd.on("plotly_click", onClick);
          }
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Cleanup: remove event listeners when effect re-runs.
    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [refreshKey, fetchFigure]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 animate-pulse" />
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
