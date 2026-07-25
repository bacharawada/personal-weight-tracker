import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import type { ChartTheme } from "../../../lib/palettes";

interface AxisBottomProps {
  ticks: number[]; // epoch ms
  scale: (ms: number) => number;
  innerWidth: number;
  innerHeight: number;
  theme: ChartTheme;
}

/**
 * Bottom (time) axis: baseline, vertical gridlines and dated tick labels.
 *
 * Tick labels follow the user's date-order preference and drop the year, which
 * would make them collide.
 */
export function AxisBottom({
  ticks,
  scale,
  innerWidth,
  innerHeight,
  theme,
}: AxisBottomProps) {
  const { formatDateMsShort } = useDisplayPreferences();

  return (
    <g>
      <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={theme.axis} strokeWidth={1} />
      {ticks.map((ms) => {
        const x = scale(ms);
        return (
          <g key={ms} transform={`translate(${x}, 0)`}>
            <line y1={0} y2={innerHeight} stroke={theme.grid} strokeWidth={1} />
            <line y1={innerHeight} y2={innerHeight + 5} stroke={theme.axis} strokeWidth={1} />
            <text
              y={innerHeight + 18}
              textAnchor="middle"
              fontSize={11}
              fill={theme.mutedText}
            >
              {formatDateMsShort(ms)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface AxisLeftProps {
  ticks: number[];
  scale: (value: number) => number;
  innerWidth: number;
  theme: ChartTheme;
  /** Number of decimals on tick labels. */
  precision?: number;
}

/** Left (value) axis: horizontal gridlines and numeric tick labels. */
export function AxisLeft({ ticks, scale, innerWidth, theme, precision = 0 }: AxisLeftProps) {
  return (
    <g>
      {ticks.map((value) => {
        const y = scale(value);
        return (
          <g key={value} transform={`translate(0, ${y})`}>
            <line x1={0} x2={innerWidth} stroke={theme.grid} strokeWidth={1} />
            <text
              x={-8}
              y={0}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill={theme.mutedText}
            >
              {value.toFixed(precision)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
