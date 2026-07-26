import { useState } from "react";
import type { ChartTheme } from "../../../lib/palettes";

export interface TooltipLine {
  label: string;
  value: string;
  color?: string;
}

export interface HoverDot {
  y: number;
  color: string;
}

export interface HoverPoint<T> {
  x: number;
  payload: T;
}

interface HoverLayerProps<T> {
  points: HoverPoint<T>[];
  innerWidth: number;
  innerHeight: number;
  theme: ChartTheme;
  header: (payload: T) => string;
  lines: (payload: T) => TooltipLine[];
  dots?: (payload: T) => HoverDot[];
  onSelect?: (payload: T) => void;
}

const LINE_HEIGHT = 16;
const PADDING = 8;
const CHAR_WIDTH = 6.2;

/**
 * Transparent overlay that captures pointer events, finds the nearest point by
 * x, and draws a crosshair, value dots and an SVG tooltip. Clicking selects the
 * nearest point's payload.
 */
export function HoverLayer<T>({
  points,
  innerWidth,
  innerHeight,
  theme,
  header,
  lines,
  dots,
  onSelect,
}: HoverLayerProps<T>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  /** Is this point's x inside the plotting area (i.e. not clipped away)? */
  function isVisible(point: HoverPoint<T>): boolean {
    return point.x >= 0 && point.x <= innerWidth;
  }

  function nearestIndex(mouseX: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      // A point outside the pinned date window is clipped out of the plot, so it
      // must not answer the crosshair either — otherwise hovering near an edge
      // reports an off-screen value the axes were never fitted to.
      if (!isVisible(points[i])) continue;
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function handleMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    setActiveIndex(nearestIndex(mouseX));
  }

  // Re-checked on every render: the domain can change (a range preset, a resize)
  // while a point is held active, pushing it out of the plotting area.
  const held = activeIndex !== null ? points[activeIndex] ?? null : null;
  const active = held && isVisible(held) ? held : null;
  const headerText = active ? header(active.payload) : "";
  const tooltipLines = active ? lines(active.payload) : [];
  const tooltipDots = active && dots ? dots(active.payload) : [];

  const boxWidth =
    PADDING * 2 +
    Math.max(
      headerText.length * CHAR_WIDTH,
      ...tooltipLines.map((l) => (l.label.length + l.value.length + 4) * CHAR_WIDTH),
      1,
    );
  const boxHeight = PADDING * 2 + LINE_HEIGHT * (tooltipLines.length + 1);
  const flip = active ? active.x + boxWidth + 14 > innerWidth : false;
  const boxX = active ? (flip ? active.x - boxWidth - 12 : active.x + 12) : 0;
  const boxY = Math.max(0, Math.min(innerHeight - boxHeight, 8));

  return (
    <g>
      {active && (
        <g pointerEvents="none">
          <line
            x1={active.x}
            x2={active.x}
            y1={0}
            y2={innerHeight}
            stroke={theme.reference}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {tooltipDots.map((dot, i) => (
            <circle
              key={i}
              cx={active.x}
              cy={dot.y}
              r={4}
              fill={dot.color}
              stroke={theme.tooltipBg}
              strokeWidth={1.5}
            />
          ))}
          <g transform={`translate(${boxX}, ${boxY})`}>
            <rect
              width={boxWidth}
              height={boxHeight}
              rx={6}
              fill={theme.tooltipBg}
              stroke={theme.tooltipBorder}
              strokeWidth={1}
              opacity={0.97}
            />
            <text
              x={PADDING}
              y={PADDING + LINE_HEIGHT - 4}
              fontSize={11}
              fontWeight={700}
              fill={theme.tooltipText}
            >
              {headerText}
            </text>
            {tooltipLines.map((line, i) => (
              <text
                key={i}
                x={PADDING}
                y={PADDING + LINE_HEIGHT * (i + 2) - 4}
                fontSize={11}
                fill={theme.tooltipText}
              >
                <tspan fill={line.color ?? theme.tooltipText}>●</tspan>
                <tspan dx={4}>{`${line.label}: ${line.value}`}</tspan>
              </text>
            ))}
          </g>
        </g>
      )}
      <rect
        width={innerWidth}
        height={innerHeight}
        fill="transparent"
        style={{ cursor: onSelect ? "pointer" : "crosshair" }}
        onPointerMove={handleMove}
        onPointerLeave={() => setActiveIndex(null)}
        onClick={() => {
          if (onSelect && active) onSelect(active.payload);
        }}
      />
    </g>
  );
}
