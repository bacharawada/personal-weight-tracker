/**
 * MeasurementRow — a single row in the measurements table.
 *
 * Handles the animated inline-edit view (input + save/cancel buttons)
 * and the normal read view (weight display + edit/delete hover actions).
 */

import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { Measurement } from "../../lib/types";

interface MeasurementRowProps {
  measurement: Measurement;
  isEditing: boolean;
  editWeight: string;
  editError: string | null;
  saving: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onEditStart: (m: Measurement, e: React.MouseEvent) => void;
  onEditSave: (date: string) => void;
  onEditCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent, date: string) => void;
  onWeightChange: (value: string) => void;
  onErrorClear: () => void;
  onDeleteRequest: (m: Measurement) => void;
}

export function MeasurementRow({
  measurement: m,
  isEditing,
  editWeight,
  editError,
  saving,
  inputRef,
  onEditStart,
  onEditSave,
  onEditCancel,
  onKeyDown,
  onWeightChange,
  onErrorClear,
  onDeleteRequest,
}: MeasurementRowProps) {
  return (
    <tr
      className={`group transition-colors ${
        isEditing ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
      }`}
    >
      {/* Date */}
      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium">
        {m.date}
      </td>

      {/* Weight — static or inline edit input */}
      <td className="px-4 py-2 text-right">
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
                min={40}
                max={300}
                step={0.05}
                className="w-28 text-right rounded-md border border-yellow-400 dark:border-yellow-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
              {m.weight.toFixed(2)}
            </motion.span>
          )}
        </AnimatePresence>
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 text-right">
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
              title="Save"
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
            >
              <Check size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEditCancel}
              title="Cancel"
            >
              <X size={15} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => onEditStart(m, e)}
              title="Edit weight"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
              title="Delete"
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
