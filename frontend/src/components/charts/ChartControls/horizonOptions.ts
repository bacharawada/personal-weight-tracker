/** How far past the last measurement every model projects, in days. */
export const HORIZON_OPTIONS = [
  { unit: "none", count: 0, value: 0 },
  { unit: "weeks", count: 4, value: 28 },
  { unit: "weeks", count: 8, value: 56 },
  { unit: "months", count: 3, value: 90 },
  { unit: "months", count: 6, value: 180 },
] as const;

/**
 * Resolve a horizon value to its translation key and plural count.
 *
 * Shared by the selector and the collapsed summary line so both label the same
 * horizon identically. An unknown value falls back to the first option.
 */
export function getHorizonI18n(value: number) {
  const option =
    HORIZON_OPTIONS.find((candidate) => candidate.value === value) ?? HORIZON_OPTIONS[0];
  return { key: `horizon.${option.unit}` as const, count: option.count };
}
