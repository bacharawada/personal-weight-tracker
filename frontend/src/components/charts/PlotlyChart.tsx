import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plotly } from "../../lib/PlotlyFactory";
import { Spinner } from "../ui/Spinner";

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
            margin: { l: 70, r: 40, t: 90, b: 60 },
          },
          { responsive: true, displayModeBar: true }
        ).then((gd: Plotly.PlotlyHTMLElement) => {
          if (onClick) {
            gd.on("plotly_click", onClick);
          }
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [refreshKey, fetchFigure]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}
    >
      {/* Spinner overlay — fades out when data arrives */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="chart-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg"
          >
            <Spinner size={32} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart fades in after loading */}
      <motion.div
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
