import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plotly } from "../../lib/PlotlyFactory";
import { Spinner } from "../ui/Spinner";

interface PlotlyChartProps {
  fetchFigure: () => Promise<object>;
  refreshKey: number;
  onClick?: (event: Plotly.PlotMouseEvent) => void;
  className?: string;
}

/** Returns true when the viewport is narrower than the md breakpoint (768px). */
function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export function PlotlyChart({
  fetchFigure,
  refreshKey,
  onClick,
  className = "",
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest fetchFigure so the effect closure always calls
  // the current version without needing fetchFigure in the dependency array.
  const fetchFigureRef = useRef(fetchFigure);
  useLayoutEffect(() => {
    fetchFigureRef.current = fetchFigure;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    console.log("[PlotlyChart] fetching — refreshKey:", refreshKey);
    setLoading(true);

    const mobile = isMobile();

    fetchFigureRef.current()
      .then((fig: any) => {
        if (!containerRef.current) return;

        Plotly.react(
          containerRef.current,
          fig.data ?? [],
          {
            ...(fig.layout ?? {}),
            autosize: true,
            // Tighter margins on mobile to maximise chart area
            margin: mobile
              ? { l: 45, r: 16, t: 48, b: 48 }
              : { l: 70, r: 40, t: 100, b: 60 },
            // Smaller font on mobile
            font: {
              ...(fig.layout?.font ?? {}),
              size: mobile ? 10 : (fig.layout?.font?.size ?? 12),
            },
            // Simplify legend on mobile
            legend: mobile
              ? { orientation: "h", y: -0.2, font: { size: 10 } }
              : (fig.layout?.legend ?? {}),
          },
          {
            responsive: true,
            // Hide the Plotly modebar (floating toolbar) on mobile — too cluttered
            displayModeBar: !mobile,
          }
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
  }, [refreshKey]); // only re-fetch when the data actually changes

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col ${className}`}
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
