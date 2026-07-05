import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FrameDims {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}

interface ChartFrameProps {
  margin: Margin;
  /** Forwarded ref to the underlying <svg> (used by PNG export). */
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
  children: (dims: FrameDims) => ReactNode;
}

/**
 * Responsive SVG container. Measures its own box via ResizeObserver and hands
 * the resolved inner dimensions (after margins) to a render-prop child. The
 * chart content is translated into the plotting area, so children draw in
 * inner coordinates with the origin at the top-left of the plot.
 */
export function ChartFrame({ margin, svgRef, className = "", children }: ChartFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  const ready = innerWidth > 0 && innerHeight > 0;

  return (
    <div ref={wrapperRef} className={`relative h-full w-full ${className}`}>
      {ready && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {children({ width, height, innerWidth, innerHeight, margin })}
          </g>
        </svg>
      )}
    </div>
  );
}
