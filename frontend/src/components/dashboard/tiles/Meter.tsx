/**
 * Meter — a magnitude against a reference and an expected range.
 *
 * A bare number can't answer "is that good?". The bar gives the magnitude, the
 * shaded band the range it is expected to fall in, and the tick the value it is
 * being held to — so the comparison is read rather than computed.
 *
 * Everything is expressed in one positive domain: callers pass magnitudes and
 * keep the sign in their own copy.
 */

interface MeterBand {
  from: number;
  to: number;
}

interface MeterMarker {
  value: number;
  label: string;
}

interface MeterProps {
  /** Bar length, in the same units as `max`. Clamped to the track. */
  value: number;
  /** Upper end of the track. */
  max: number;
  /** Range the value is expected to fall in, drawn behind the bar. */
  band?: MeterBand | null;
  /** Reference value, drawn as a labelled tick. */
  marker?: MeterMarker | null;
  ariaLabel: string;
}

/** Position within the track as a CSS percentage, clamped to its ends. */
function offset(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
}

export function Meter({ value, max, band = null, marker = null, ariaLabel }: MeterProps) {
  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
      >
        {band && (
          <div
            className="absolute inset-y-0 bg-green-100 dark:bg-green-900/40"
            style={{
              left: offset(band.from, max),
              width: offset(band.to - band.from, max),
            }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: offset(value, max), backgroundColor: "var(--color-accent)" }}
        />
      </div>

      {marker && (
        <div className="relative h-4 mt-1">
          {/* The tick sits above its label, spanning the track it refers to. */}
          <div
            className="absolute -top-5 h-5 w-0.5 -translate-x-1/2 bg-gray-900 dark:bg-gray-100"
            style={{ left: offset(marker.value, max) }}
          />
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400"
            style={{ left: offset(marker.value, max) }}
          >
            {marker.label}
          </span>
        </div>
      )}
    </div>
  );
}
