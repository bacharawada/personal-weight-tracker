import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { AddMeasurement } from "../components/forms/AddMeasurement";
import { CsvImport } from "../components/onboarding/CsvImport";
import { getMeasurements, updateMeasurement, deleteMeasurement, exportCsvUrl } from "../lib/api";
import type { CsvImportResult, Measurement } from "../lib/types";
import { Spinner } from "../components/ui/Spinner";
import {
  Check,
  Download,
  FileUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

export function DataPage() {
  const { refreshKey, bump, accent, hasData } = useWeightTracker();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKey, setCsvKey] = useState(0);

  // Inline edit state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Measurement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMeasurements()
      .then(setMeasurements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingDate && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDate]);

  const cancelEdit = useCallback(() => {
    setEditingDate(null);
    setEditWeight("");
    setEditError(null);
  }, []);

  const saveEdit = useCallback(async (date: string) => {
    const w = parseFloat(editWeight);
    if (isNaN(w) || w < 40 || w > 300) {
      setEditError("Must be 40–300 kg");
      return;
    }
    setSaving(true);
    try {
      await updateMeasurement(date, w);
      setEditingDate(null);
      setEditWeight("");
      setEditError(null);
      bump();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editWeight, bump]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: string) => {
      if (e.key === "Enter") saveEdit(date);
      if (e.key === "Escape") cancelEdit();
    },
    [saveEdit, cancelEdit]
  );

  const startEdit = useCallback((m: Measurement, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(null);
    setEditingDate(m.date);
    setEditWeight(String(m.weight));
    setEditError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeasurement(deleteTarget.date);
      setDeleteTarget(null);
      bump();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, bump]);

  const handleCsvComplete = useCallback(
    (_result: CsvImportResult) => {
      bump();
      // Let the user see the success state briefly before closing
      setTimeout(() => {
        setCsvOpen(false);
        setCsvKey((k) => k + 1);
      }, 1800);
    },
    [bump]
  );

  return (
    <PageTransition>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <PageTitle
            title="Data"
            subtitle={`${measurements.length} measurement${measurements.length !== 1 ? "s" : ""} recorded`}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={15} /> Add entry
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCsvOpen(true)}
            >
              <FileUp size={15} /> Import CSV
            </Button>

            <a
              href={hasData ? exportCsvUrl() : undefined}
              download={hasData ? "measurements.csv" : undefined}
              aria-disabled={!hasData}
              className={[
                "inline-flex items-center gap-2 h-9 rounded-md px-3 text-sm font-medium",
                "border border-input bg-background transition-colors",
                hasData
                  ? "hover:bg-muted dark:hover:bg-muted/50 text-foreground cursor-pointer"
                  : "opacity-50 pointer-events-none text-foreground",
              ].join(" ")}
            >
              <Download size={15} /> Export CSV
            </a>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Spinner size={28} />
            </div>
          ) : measurements.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">No measurements yet.</p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-2 text-sm font-medium underline underline-offset-2"
                style={{ color: "var(--color-accent)" }}
              >
                Add your first one
              </button>
            </div>
          ) : (
            <motion.table
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full text-sm"
            >
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Weight (kg)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400 w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {measurements.map((m) => {
                  const isEditing = editingDate === m.date;

                  return (
                    <tr
                      key={m.date}
                      className={`group transition-colors ${
                        isEditing ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium">
                        {m.date}
                      </td>

                      {/* Weight */}
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
                                onChange={(e) => { setEditWeight(e.target.value); setEditError(null); }}
                                onKeyDown={(e) => handleKeyDown(e, m.date)}
                                onClick={(e) => e.stopPropagation()}
                                min={40} max={300} step={0.05}
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
                              variant="ghost" size="icon-sm"
                              onClick={() => saveEdit(m.date)}
                              disabled={saving}
                              title="Save"
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                            >
                              <Check size={15} />
                            </Button>
                            <Button
                              variant="ghost" size="icon-sm"
                              onClick={cancelEdit}
                              title="Cancel"
                            >
                              <X size={15} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon-sm"
                              onClick={(e) => startEdit(m, e)}
                              title="Edit weight"
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost" size="icon-sm"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
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
                })}
              </tbody>
            </motion.table>
          )}
        </div>
      </div>

      {/* ── Add measurement modal ─────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add measurement</DialogTitle>
            <DialogDescription>
              Enter a date and your weight in kilograms.
            </DialogDescription>
          </DialogHeader>
          <AddMeasurement
            onSuccess={() => {
              bump();
              setAddOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Import CSV modal ──────────────────────────────── */}
      <Dialog
        open={csvOpen}
        onOpenChange={(open) => {
          if (!open) setCsvKey((k) => k + 1);
          setCsvOpen(open);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with <code>date</code> and <code>weight</code> columns.
              Delimiter and date format are detected automatically.
            </DialogDescription>
          </DialogHeader>
          <CsvImport
            key={csvKey}
            onComplete={handleCsvComplete}
            onBack={() => { setCsvOpen(false); setCsvKey((k) => k + 1); }}
            accent={accent}
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation modal ─────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete measurement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the measurement for{" "}
              <strong>{deleteTarget?.date}</strong> ({deleteTarget?.weight} kg)?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
