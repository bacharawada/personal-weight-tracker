/**
 * The journey as a single stream of events.
 *
 * Dose changes, plateaus and milestones each lived in their own panel or table,
 * which hid the one thing they say together: causality. Interleaved by date, a
 * dose increase followed by a doubled rate of loss becomes readable as a story
 * instead of two unrelated facts.
 *
 * Dose events come from the impact endpoint rather than the dose journal: it
 * already reduces the journal to the events that matter (a first dose, or a dose
 * differing from the previous one for the same molecule) and carries the
 * before/after slopes with them. A dose repeated weekly at the same amount is
 * not an event.
 *
 * Not included: the chart's acceleration zones. They live in the weight-chart
 * payload, which only the chart component fetches, and plateau history already
 * covers the deceleration half.
 */

import type {
  DoseImpact,
  Measurement,
  MilestonesProjection,
  PlateauStatus,
} from "../types";

export const EventKind = {
  Start: "start",
  Milestone: "milestone",
  Plateau: "plateau",
  Dose: "dose",
} as const;
export type EventKind = (typeof EventKind)[keyof typeof EventKind];

/** First recorded measurement — where the journey starts. */
export interface StartEvent {
  kind: typeof EventKind.Start;
  date: string;
  weightKg: number;
}

/** A milestone crossed on its way to the goal. */
export interface MilestoneEvent {
  kind: typeof EventKind.Milestone;
  date: string;
  index: number;
  targetWeightKg: number;
}

/** A past plateau, anchored at its start. */
export interface PlateauEvent {
  kind: typeof EventKind.Plateau;
  date: string;
  endDate: string;
  durationDays: number;
}

/** A first dose or a dose change, with the trend on either side of it. */
export interface DoseEvent {
  kind: typeof EventKind.Dose;
  date: string;
  medication: string;
  doseMg: number | null;
  previousDoseMg: number | null;
  isFirst: boolean;
  /** kg/week before and after the change; `null` when a side had too few points. */
  slopeBeforePerWeek: number | null;
  slopeAfterPerWeek: number | null;
}

export type DashboardEvent = StartEvent | MilestoneEvent | PlateauEvent | DoseEvent;

interface EventSources {
  measurements: Measurement[];
  milestones: MilestonesProjection | null;
  plateau: PlateauStatus | null;
  doseChanges: DoseImpact[];
}

/**
 * Merge every source into one stream, newest first — the order the timeline
 * reads in, since the most recent event is the one that still matters.
 */
export function buildEvents({
  measurements,
  milestones,
  plateau,
  doseChanges,
}: EventSources): DashboardEvent[] {
  const events: DashboardEvent[] = [];

  if (measurements.length > 0) {
    const first = measurements[0];
    events.push({
      kind: EventKind.Start,
      date: first.date.slice(0, 10),
      weightKg: first.weight,
    });
  }

  for (const milestone of milestones?.milestones ?? []) {
    if (!milestone.achieved || milestone.achieved_date == null) continue;
    events.push({
      kind: EventKind.Milestone,
      date: milestone.achieved_date.slice(0, 10),
      index: milestone.index,
      targetWeightKg: milestone.target_weight,
    });
  }

  for (const zone of plateau?.history ?? []) {
    events.push({
      kind: EventKind.Plateau,
      date: zone.start.slice(0, 10),
      endDate: zone.end.slice(0, 10),
      durationDays: zone.duration_days,
    });
  }

  for (const change of doseChanges) {
    events.push({
      kind: EventKind.Dose,
      date: change.date.slice(0, 10),
      medication: change.medication,
      doseMg: change.dose_mg,
      previousDoseMg: change.previous_dose_mg,
      isFirst: change.is_first,
      slopeBeforePerWeek: change.slope_before_per_week,
      slopeAfterPerWeek: change.slope_after_per_week,
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}
