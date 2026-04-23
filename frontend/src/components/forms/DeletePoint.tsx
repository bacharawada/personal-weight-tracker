import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { deleteMeasurement } from "../../lib/api";
import { Trash2 } from "lucide-react";

interface DeletePointProps {
  selectedPoint: { date: string; weight: number } | null;
  onSuccess: () => void;
}

export function DeletePoint({ selectedPoint, onSuccess }: DeletePointProps) {
  const { accent } = useWeightTracker();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleDelete() {
    if (!selectedPoint) return;

    try {
      await deleteMeasurement(selectedPoint.date);
      setFeedback({ type: "success", msg: `Deleted: ${selectedPoint.date}` });
      setConfirming(false);
      onSuccess();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFeedback({ type: "error", msg });
      setConfirming(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        Delete Measurement
      </h3>

      {selectedPoint ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Selected: <strong>{selectedPoint.date}</strong> — {selectedPoint.weight} kg
        </p>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
          Click a row in the table to select it.
        </p>
      )}

      {/* Crossfade between Delete and Confirm buttons */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {!confirming ? (
            <motion.button
              key="delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setConfirming(true)}
              disabled={!selectedPoint}
              className="w-full flex items-center justify-center gap-1.5 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:pointer-events-none rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <Trash2 size={14} /> Delete Selected Point
            </motion.button>
          ) : (
            <motion.button
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <Trash2 size={14} /> Confirm Deletion
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-2 p-2 rounded-md text-sm overflow-hidden ${
              feedback.type === "error"
                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                : ""
            }`}
            style={
              feedback.type === "success"
                ? { backgroundColor: `${accent}22`, color: accent }
                : undefined
            }
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
