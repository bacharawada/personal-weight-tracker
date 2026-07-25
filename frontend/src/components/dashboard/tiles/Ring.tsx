/**
 * Ring — radial progress readout.
 *
 * A share of a whole reads faster as a filled arc than as a number, and unlike
 * a progress bar it stays legible at tile scale. The arc is drawn with a dash
 * offset on a rotated circle so it grows clockwise from twelve o'clock.
 */

interface RingProps {
  /** Share complete, 0–100. Values outside the range are clamped. */
  percent: number;
  /** What the ring measures, for screen readers. */
  ariaLabel: string;
  /** Outer diameter in pixels. */
  size?: number;
}

export function Ring({ percent, ariaLabel, size = 76 }: RingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const strokeWidth = size / 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
      className="shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ stroke: "var(--color-accent)" }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 4}
        fontWeight={700}
        fill="currentColor"
        className="text-gray-900 dark:text-gray-100"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
