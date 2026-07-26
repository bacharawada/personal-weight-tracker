/**
 * MeasurementRow — a single row in the measurements table.
 *
 * Handles the animated inline-edit view (input + save/cancel buttons)
 * and the normal read view (weight display + edit/delete hover actions).
 *
 * Below sm only date, weight and actions fit the card. The change column is
 * dropped (it is derived, and the charts show the trend anyway) and the note
 * moves out of the grid: a second line under the date when reading, a
 * full-width row of its own when editing — so nothing becomes unreachable on a
 * phone.
 */

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, StickyNote, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import type { Measurement, WeightUnit } from "../../lib/types";
import { kgToDisplay, weightBounds } from "../../lib/units";

const NOTE_MAX_LENGTH = 500;

/**
 * Below this magnitude (kg) a change is scale noise, not a trend — same
 * threshold the dashboard's DeltaStat uses, so both read a flat day the same.
 */
const FLAT_THRESHOLD_KG = 0.05;

interface MeasurementRowProps {
  measurement: Measurement;
  /** Signed change against the previous measurement; `null` on the first row. */
  deltaKg: number | null;
  unit: WeightUnit;
  isEditing: boolean;
  editWeight: string;
  editNote: string;
  editError: string | null;
  saving: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onEditStart: (m: Measurement, e: React.MouseEvent) => void;
  onEditSave: (date: string) => void;
  onEditCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent, date: string) => void;
  onWeightChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onErrorClear: () => void;
  onDeleteRequest: (m: Measurement) => void;
}

export function MeasurementRow({
  measurement: m,
  deltaKg,
  unit,
  isEditing,
  editWeight,
  editNote,
  editError,
  saving,
  inputRef,
  onEditStart,
  onEditSave,
  onEditCancel,
  onKeyDown,
  onWeightChange,
  onNoteChange,
  onErrorClear,
  onDeleteRequest,
}: MeasurementRowProps) {
  const { t } = useTranslation("data");
  const { formatDate } = useDisplayPreferences();
  const bounds = weightBounds(unit);

  // Losing weight is the goal, so a drop reads green and a gain red.
  const isFlat = deltaKg == null || Math.abs(deltaKg) < FLAT_THRESHOLD_KG;
  const deltaTone = isFlat
    ? "text-gray-400 dark:text-gray-500"
    : deltaKg < 0
      ? "text-green-600"
      : "text-red-600";
  const deltaDisplay = deltaKg == null ? null : kgToDisplay(deltaKg, unit);
  const deltaText =
    deltaDisplay == null
      ? null
      : `${!isFlat && deltaDisplay > 0 ? "+" : ""}${deltaDisplay.toFixed(2)}`;
  const noteInputClass =
    "w-full rounded-md border border-yellow-400 dark:border-yellow-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <>
      <tr
        className={`group transition-colors ${
          isEditing ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
        }`}
      >
        {/* Date — carries the note preview below sm, where the note column is gone */}
        <td className="px-2.5 py-2.5 text-gray-900 dark:text-gray-100 font-medium sm:px-4">
          <span className="block whitespace-nowrap">{formatDate(m.date)}</span>
          {m.note && !isEditing && (
            <span
              title={m.note}
              className="mt-0.5 flex max-w-[10rem] items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400 sm:hidden"
            >
              <StickyNote size={11} className="shrink-0" />
              <span className="truncate">{m.note}</span>
            </span>
          )}
        </td>

        {/* Weight — static or inline edit input */}
        <td className="px-2.5 py-2 text-right sm:px-4">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col items-end gap-1"
              >
                <input
                  ref={inputRef}
                  type="number"
                  value={editWeight}
                  onChange={(e) => {
                    onWeightChange(e.target.value);
                    onErrorClear();
                  }}
                  onKeyDown={(e) => onKeyDown(e, m.date)}
                  onClick={(e) => e.stopPropagation()}
                  min={bounds.min}
                  max={bounds.max}
                  step={0.05}
                  className="w-24 text-right rounded-md border border-yellow-400 dark:border-yellow-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 sm:w-28"
                />
                {editError && (
                  <span className="text-xs text-red-500">{editError}</span>
                )}
              </motion.div>
            ) : (
              <motion.span
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="font-mono text-gray-900 dark:text-gray-100"
              >
                {kgToDisplay(m.weight, unit).toFixed(2)}
              </motion.span>
            )}
          </AnimatePresence>
        </td>

        {/* Change against the previous measurement */}
        <td className="hidden px-4 py-2 text-right whitespace-nowrap sm:table-cell">
          {deltaText == null ? (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          ) : (
            <span className={`font-mono text-xs ${deltaTone}`}>{deltaText}</span>
          )}
        </td>

        {/* Note — static preview or inline edit input */}
        <td className="hidden px-4 py-2 max-w-[200px] sm:table-cell">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit-note"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => onNoteChange(e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, m.date)}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder={t("row.notePlaceholder")}
                  className={noteInputClass}
                />
              </motion.div>
            ) : (
              <motion.span
                key="display-note"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                title={m.note ?? undefined}
                className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate"
              >
                {m.note && <StickyNote size={13} className="shrink-0 text-gray-400 dark:text-gray-500" />}
                <span className="truncate">{m.note ?? ""}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </td>

        {/* Actions */}
        <td className="px-1.5 py-2.5 text-right sm:px-4">
          {isEditing ? (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEditSave(m.date)}
                disabled={saving}
                title={t("actions.save", { ns: "common" })}
                className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                <Check size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onEditCancel}
                title={t("actions.cancel", { ns: "common" })}
              >
                <X size={15} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => onEditStart(m, e)}
                title={t("row.editWeight")}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]"
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(m);
                }}
                title={t("actions.delete", { ns: "common" })}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </td>
      </tr>

      {/*
        Note field for phones, where the note column is hidden. A row of its own
        rather than a second line in the weight cell: the input needs the full
        card width to be usable.
      */}
      {isEditing && (
        <tr className="bg-yellow-50 sm:hidden dark:bg-yellow-950/20">
          <td colSpan={3} className="px-2.5 pt-0 pb-2.5">
            <input
              type="text"
              value={editNote}
              onChange={(e) => onNoteChange(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, m.date)}
              onClick={(e) => e.stopPropagation()}
              maxLength={NOTE_MAX_LENGTH}
              placeholder={t("row.notePlaceholder")}
              className={noteInputClass}
            />
          </td>
        </tr>
      )}
    </>
  );
}
