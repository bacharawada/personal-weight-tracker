/**
 * BandScale — a value placed on a banded scale.
 *
 * A number plus a category name ("28.4, overweight") says where you are but not
 * how far from anywhere else. Placing the marker on the bands shows the distance
 * to the next one, and the optional ghost marker shows where a target lands —
 * which reframes the target in the scale's own terms.
 *
 * Markers are drawn as ticks, matching the reference marker on Meter so the two
 * read the same way across tiles.
 */

export interface ScaleBand {
  /** Upper bound of the band, in domain units. */
  to: number;
  /** Background classes for the band, light and dark. */
  className: string;
}

interface BandScaleProps {
  min: number;
  max: number;
  /** Bands in ascending order; the last one's `to` should reach `max`. */
  bands: ScaleBand[];
  /** Where the current value sits. Clamped to the domain. */
  value: number;
  /** Optional second marker below the scale, e.g. a target. */
  ghost?: { value: number; label: string } | null;
  ariaLabel: string;
}

/** Position within the domain as a CSS percentage, clamped to its ends. */
function offset(value: number, min: number, max: number): string {
  const span = max - min;
  if (span <= 0) return "0%";
  return `${Math.min(100, Math.max(0, ((value - min) / span) * 100))}%`;
}

/** Share of the domain a band covers, as a CSS percentage. */
function width(from: number, to: number, min: number, max: number): string {
  const span = max - min;
  if (span <= 0) return "0%";
  return `${Math.max(0, ((to - from) / span) * 100)}%`;
}

export function BandScale({
  min,
  max,
  bands,
  value,
  ghost = null,
  ariaLabel,
}: BandScaleProps) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="relative flex h-2.5 overflow-hidden rounded-sm">
        {bands.map((band, index) => (
          <div
            key={band.to}
            className={band.className}
            style={{
              width: width(index === 0 ? min : bands[index - 1].to, band.to, min, max),
            }}
          />
        ))}
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 bg-gray-900 dark:bg-gray-100"
          style={{ left: offset(value, min, max) }}
        />
      </div>

      {ghost && (
        <div className="relative h-4 mt-1.5">
          <div
            className="absolute -top-2 h-2 w-0.5 -translate-x-1/2 bg-green-600"
            style={{ left: offset(ghost.value, min, max) }}
          />
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-green-700 dark:text-green-400"
            style={{ left: offset(ghost.value, min, max) }}
          >
            {ghost.label}
          </span>
        </div>
      )}
    </div>
  );
}
