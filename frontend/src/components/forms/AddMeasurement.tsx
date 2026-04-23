import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { addMeasurement } from "../../lib/api";
import { Plus } from "lucide-react";

interface AddMeasurementProps {
  onSuccess: () => void;
}

export function AddMeasurement({ onSuccess }: AddMeasurementProps) {
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !weight) {
      setFeedback({ type: "error", msg: "Please fill in both date and weight." });
      return;
    }

    const w = parseFloat(weight);
    if (isNaN(w) || w < 40 || w > 300) {
      setFeedback({ type: "error", msg: "Weight must be between 40 and 300 kg." });
      return;
    }

    setLoading(true);
    try {
      await addMeasurement({ date, weight: w });
      setFeedback({ type: "success", msg: `Added: ${date} — ${w} kg` });
      setDate("");
      setWeight("");
      onSuccess();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFeedback({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        Add Measurement
      </h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={40}
            max={300}
            step={0.05}
            placeholder="e.g. 75.5"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={14} /> {loading ? "Adding…" : "Add"}
        </button>
      </form>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-2 p-2 rounded-md text-sm overflow-hidden ${
              feedback.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
            }`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
