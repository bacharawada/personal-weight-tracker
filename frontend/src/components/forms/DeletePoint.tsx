import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deleteMeasurement } from "../../lib/api";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";

interface DeletePointProps {
  selectedPoint: { date: string; weight: number } | null;
  onSuccess: () => void;
}

export function DeletePoint({ selectedPoint, onSuccess }: DeletePointProps) {
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
            <motion.div
              key="delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={!selectedPoint}
                className="w-full"
              >
                <Trash2 size={14} /> Delete Selected Point
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 size={14} /> Confirm Deletion
              </Button>
            </motion.div>
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
                : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
            }`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
