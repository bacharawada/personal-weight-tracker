import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { addMeasurement } from "../../lib/api";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { displayToKg, unitLabel, weightBounds } from "../../lib/units";

const NOTE_MAX_LENGTH = 500;

interface AddMeasurementProps {
  onSuccess: () => void;
}

export function AddMeasurement({ onSuccess }: AddMeasurementProps) {
  const { t } = useTranslation("data");
  const { unit } = useWeightTracker();
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const u = unitLabel(unit);
  const bounds = weightBounds(unit);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !weight) {
      setFeedback({ type: "error", msg: t("form.errorFillBoth") });
      return;
    }

    const entered = parseFloat(weight);
    if (isNaN(entered) || entered < bounds.min || entered > bounds.max) {
      setFeedback({
        type: "error",
        msg: t("form.errorRange", {
          min: bounds.min.toFixed(0),
          max: bounds.max.toFixed(0),
          unit: u,
        }),
      });
      return;
    }

    const w = displayToKg(entered, unit);
    setLoading(true);
    try {
      await addMeasurement({ date, weight: w, note: note.trim() || undefined });
      setFeedback({ type: "success", msg: t("form.added", { date, weight: entered, unit: u }) });
      setDate("");
      setWeight("");
      setNote("");
      onSuccess();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("form.errorUnknown");
      setFeedback({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="add-date" className="text-xs text-muted-foreground">{t("form.dateLabel")}</Label>
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
          <Label htmlFor="add-weight" className="text-xs text-muted-foreground">{t("form.weightLabel", { unit: u })}</Label>
          <Input
            id="add-weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min={bounds.min}
            max={bounds.max}
            step={0.05}
            placeholder={u === "lb" ? t("form.weightPlaceholderLb") : t("form.weightPlaceholderKg")}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add-note" className="text-xs text-muted-foreground">{t("form.noteLabel")}</Label>
          <Input
            id="add-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX_LENGTH}
            placeholder={t("form.notePlaceholder")}
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {note.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={loading}
          className="w-full"
        >
          <Plus size={14} /> {loading ? t("form.submitAdding") : t("form.submitAdd")}
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
