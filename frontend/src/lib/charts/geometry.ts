/**
 * SVG path builders for the custom charts.
 *
 * Thin wrappers over `d3-shape` that operate on already-projected pixel
 * coordinates, so the caller owns all scaling decisions.
 */

import { area, line } from "d3-shape";

export interface PixelPoint {
  x: number;
  y: number;
}

export interface PixelBand {
  x: number;
  y0: number;
  y1: number;
}

const lineGen = line<PixelPoint>()
  .x((d) => d.x)
  .y((d) => d.y);

const areaGen = area<PixelBand>()
  .x((d) => d.x)
  .y0((d) => d.y0)
  .y1((d) => d.y1);

/** Build an SVG path `d` string for a polyline through pixel points. */
export function linePath(points: PixelPoint[]): string {
  return lineGen(points) ?? "";
}

/** Build an SVG path `d` string for a filled band between two pixel edges. */
export function bandPath(points: PixelBand[]): string {
  return areaGen(points) ?? "";
}
