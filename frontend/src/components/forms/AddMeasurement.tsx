import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { addMeasurement } from "../../lib/api";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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
        <div className="space-y-1">
          <Label htmlFor="add-date" className="text-xs text-muted-foreground">Date</Label>
          <Input
            id="add-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add-weight" className="text-xs text-muted-foreground">Weight (kg)</Label>
          <Input
            id="add-weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={40}
            max={300}
            step={0.05}
            placeholder="e.g. 75.5"
            className="h-8 text-sm"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={loading}
          className="w-full"
        >
          <Plus size={14} /> {loading ? "Adding…" : "Add"}
        </Button>
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
