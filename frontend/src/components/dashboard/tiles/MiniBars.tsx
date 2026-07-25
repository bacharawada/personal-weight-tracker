/**
 * MiniBars — signed values around a zero baseline, at tile scale.
 *
 * Bars grow down from the baseline for the desired direction (losing) and up
 * against it, so a run of progress reads as one shape rather than a sequence of
 * numbers. Heights are relative to the largest magnitude in the set: the point
 * is the rhythm, and an axis would cost more room than it earns here.
 */

interface MiniBarsProps {
  /** Signed values, oldest first. Negative is the desired direction. */
  values: number[];
  ariaLabel: string;
  /** Total height in pixels, split evenly above and below the baseline. */
  height?: number;
}

export function MiniBars({ values, ariaLabel, height = 44 }: MiniBarsProps) {
  const peak = Math.max(...values.map(Math.abs), Number.EPSILON);
  const half = height / 2;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative flex items-stretch gap-1"
      style={{ height }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-gray-600" />
      {values.map((value, index) => {
        const magnitude = Math.max(2, (Math.abs(value) / peak) * half);
        const isDesired = value <= 0;
        return (
          <div key={index} className="relative flex-1 min-w-[3px]">
            <div
              className={[
                "absolute left-0 right-0 rounded-sm",
                isDesired ? "top-1/2" : "bottom-1/2",
                isDesired ? "" : "bg-red-400 dark:bg-red-500",
              ].join(" ")}
              style={{
                height: magnitude,
                ...(isDesired ? { backgroundColor: "var(--color-accent)" } : {}),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
