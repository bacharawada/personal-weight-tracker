/**
 * EventTimeline — dose changes, plateaus and milestones as one story.
 *
 * Vertical rather than horizontal: the number of events is unbounded (a long
 * dose journal produces dozens) and a horizontal rail stops being readable past
 * about six. Newest first, because the recent end is the one that still matters.
 *
 * Only the most recent `VISIBLE_EVENTS` are listed, with the remainder counted
 * explicitly beneath — a truncated list that hid its own truncation would read
 * as a complete history.
 */

import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { buildEvents } from "../../../lib/dashboard/events";
import type {
  DoseImpact,
  Measurement,
  MilestonesProjection,
  PlateauStatus,
} from "../../../lib/types";
import { Tile } from "../tiles";
import { EventRow } from "./EventRow";

/** Rows shown before the list is summarised. */
const VISIBLE_EVENTS = 8;

interface EventTimelineProps {
  measurements: Measurement[];
  milestones: MilestonesProjection | null;
  plateau: PlateauStatus | null;
  doseChanges: DoseImpact[];
}

export function EventTimeline({
  measurements,
  milestones,
  plateau,
  doseChanges,
}: EventTimelineProps) {
  const { t } = useTranslation("dashboard");
  const events = buildEvents({ measurements, milestones, plateau, doseChanges });

  return (
    <Tile label={t("timeline.label")} icon={<History size={16} />}>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("timeline.empty")}
        </p>
      ) : (
        <>
          <ul className="mt-4">
            {events.slice(0, VISIBLE_EVENTS).map((event, index, shown) => (
              // Two events of the same kind can share a date (two milestones
              // crossed in a day), so the position disambiguates the key.
              <EventRow
                key={`${event.kind}-${event.date}-${index}`}
                event={event}
                isLast={index === shown.length - 1}
              />
            ))}
          </ul>
          {events.length > VISIBLE_EVENTS && (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-8">
              {t("timeline.more", { count: events.length - VISIBLE_EVENTS })}
            </p>
          )}
        </>
      )}
    </Tile>
  );
}
