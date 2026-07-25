import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { addMedicationDose } from "../../lib/api";
import { MEDICATION_SUGGESTIONS } from "../../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DatePicker } from "../ui/date-picker";
import { localDateToIso } from "../../lib/dates";

interface AddMedicationDoseProps {
  onSuccess: () => void;
}

/** Form to log a medication dose: date, molecule (with suggestions), dose, note. */
export function AddMedicationDose({ onSuccess }: AddMedicationDoseProps) {
  const { t } = useTranslation("medication");
  const [date, setDate] = useState("");
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setFeedback({ type: "error", msg: t("form.errorDateRequired") });
      return;
    }
    const trimmedMedication = medication.trim();
    if (!trimmedMedication) {
      setFeedback({ type: "error", msg: t("form.errorMedicationRequired") });
      return;
    }

    let doseMg: number | null = null;
    if (dose.trim()) {
      const parsed = parseFloat(dose);
      if (isNaN(parsed) || parsed <= 0) {
        setFeedback({ type: "error", msg: t("form.errorDosePositive") });
        return;
      }
      doseMg = parsed;
    }

    setLoading(true);
    try {
      await addMedicationDose({
        date,
        medication: trimmedMedication,
        dose_mg: doseMg,
        note: note.trim() || null,
      });
      setFeedback({
        type: "success",
        msg: t("form.added", { medication: trimmedMedication, date }),
      });
      setDate("");
      setMedication("");
      setDose("");
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
          <Label htmlFor="dose-date" className="text-xs text-muted-foreground">
            {t("form.dateLabel")}
          </Label>
          <DatePicker
            id="dose-date"
            value={date}
            onChange={(v) => setDate(v ?? "")}
            max={localDateToIso(new Date())}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="dose-medication"
            className="text-xs text-muted-foreground"
          >
            {t("form.medicationLabel")}
          </Label>
          <Input
            id="dose-medication"
            type="text"
            list="medication-suggestions"
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder={t("form.medicationPlaceholder")}
            maxLength={100}
            className="h-8 text-sm"
          />
          <datalist id="medication-suggestions">
            {MEDICATION_SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dose-mg" className="text-xs text-muted-foreground">
            {t("form.doseLabel")}
          </Label>
          <Input
            id="dose-mg"
            type="number"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            min={0}
            step={0.05}
            placeholder={t("form.dosePlaceholder")}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dose-note" className="text-xs text-muted-foreground">
            {t("form.noteLabel")}
          </Label>
          <Input
            id="dose-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("form.notePlaceholder")}
            maxLength={300}
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
          <Plus size={14} /> {loading ? t("form.submitAdding") : t("form.submit")}
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
