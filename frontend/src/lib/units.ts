/**
 * Weight-unit conversion helpers.
 *
 * Weights are always stored and exchanged with the backend in kilograms.
 * These helpers convert to/from the user's chosen display unit at the UI
 * edge so the rest of the app keeps working in kg.
 */

import { WeightUnit } from "./types";

const KG_PER_LB = 0.45359237;

/** Convert a canonical kg value to the user's display unit. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === WeightUnit.Lb ? kg / KG_PER_LB : kg;
}

/** Convert a value entered in the display unit back to canonical kg. */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === WeightUnit.Lb ? value * KG_PER_LB : value;
}

/** Short label for the unit ("kg" / "lb"). */
export function unitLabel(unit: WeightUnit): string {
  return unit === WeightUnit.Lb ? "lb" : "kg";
}

/** Format a kg weight in the display unit with a trailing unit label. */
export function formatWeight(
  kg: number,
  unit: WeightUnit,
  digits = 1,
): string {
  return `${kgToDisplay(kg, unit).toFixed(digits)} ${unitLabel(unit)}`;
}

/**
 * Bounds of the valid weight range (40–300 kg) expressed in the display
 * unit, for client-side form validation.
 */
export function weightBounds(unit: WeightUnit): { min: number; max: number } {
  return {
    min: kgToDisplay(40, unit),
    max: kgToDisplay(300, unit),
  };
}
