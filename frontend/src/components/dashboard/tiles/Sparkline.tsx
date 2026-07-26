/**
 * Sparkline — the shape of a series, without axes.
 *
 * Answers "which way is this heading" in the space a number occupies. The zero
 * line is always in the domain so a series that crosses it reads correctly, and
 * the fill runs from the curve to that line rather than to the bottom edge.
 *
 * The viewBox is stretched to the tile's width, so strokes carry
 * `vector-effect="non-scaling-stroke"` to keep an even weight.
 */

interface SparklineProps {
  /** Values oldest first. Fewer than two points renders nothing. */
  values: number[];
  ariaLabel: string;
  height?: number;
}

const VIEW_WIDTH = 100;
const STROKE_WIDTH = 2;

export function Sparkline({ values, ariaLabel, height = 32 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;

  // The extreme values sit on the edge of the domain, so plotting them on the
  // edge of the viewBox puts half the stroke outside it, where the SVG viewport
  // clips it. Inset the plot by that half so the curve stays whole.
  const inset = STROKE_WIDTH / 2;
  const plotHeight = height - STROKE_WIDTH;

  const x = (index: number) => (index / (values.length - 1)) * VIEW_WIDTH;
  const y = (value: number) => inset + ((max - value) / span) * plotHeight;

  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const zeroY = y(0);
  const area = `${line} ${VIEW_WIDTH},${zeroY} 0,${zeroY}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label={ariaLabel}
    >
      <polygon points={area} fill="var(--color-accent)" opacity={0.16} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={STROKE_WIDTH}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={0}
        x2={VIEW_WIDTH}
        y1={zeroY}
        y2={zeroY}
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="text-gray-300 dark:text-gray-600"
      />
    </svg>
  );
}
