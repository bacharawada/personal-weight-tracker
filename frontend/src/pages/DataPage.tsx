import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { AddMeasurement } from "../components/forms/AddMeasurement";
import { DeletePoint } from "../components/forms/DeletePoint";
import { CsvImport } from "../components/onboarding/CsvImport";
import { getMeasurements, updateMeasurement, exportCsvUrl } from "../lib/api";
import type { CsvImportResult, Measurement } from "../lib/types";
import { Spinner } from "../components/ui/Spinner";
import { Check, ChevronDown, ChevronUp, Download, FileUp, Pencil, Trash2, X } from "lucide-react";
import { Button } from "../components/ui/button";

export function DataPage() {
  const { refreshKey, bump, selectedPoint, setSelectedPoint, hasData, accent } = useWeightTracker();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // CSV import panel state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKey, setCsvKey] = useState(0); // bump to reset CsvImport state on close

  // Inline edit state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getMeasurements()
      .then(setMeasurements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Focus the input whenever editing starts
  useEffect(() => {
    if (editingDate && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDate]);

  const handleRowClick = useCallback(
    (m: Measurement) => {
      if (editingDate) return; // Don't change selection while editing
      setSelectedPoint(selectedPoint?.date === m.date ? null : { date: m.date, weight: m.weight });
    },
    [editingDate, selectedPoint, setSelectedPoint]
  );

  const startEdit = useCallback((m: Measurement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDate(m.date);
    setEditWeight(String(m.weight));
    setEditError(null);
    setSelectedPoint(null);
  }, [setSelectedPoint]);

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

  const handleCsvComplete = useCallback(
    (_result: CsvImportResult) => {
      bump();
      // Reset and collapse the panel after a short delay so the user
      // can see the "Import complete" confirmation inside CsvImport.
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
      <div className="flex items-start justify-between">
        <PageTitle
          title="Data"
          subtitle={`${measurements.length} measurement${measurements.length !== 1 ? "s" : ""} recorded`}
        />
        <Button variant="secondary" size="sm" asChild={hasData} disabled={!hasData}>
          {hasData ? (
            <a href={exportCsvUrl()} download="measurements.csv">
              <Download size={16} /> Export CSV
            </a>
          ) : (
            <span><Download size={16} /> Export CSV</span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table — 2/3 width */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center items-center">
              <Spinner size={28} />
            </div>
          ) : measurements.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No measurements yet. Add your first one.
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
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {measurements.map((m) => {
                  const isSelected = selectedPoint?.date === m.date;
                  const isEditing = editingDate === m.date;

                  return (
                    <tr
                      key={m.date}
                      onClick={() => handleRowClick(m)}
                      className={`group transition-colors ${
                        isEditing
                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                          : "cursor-pointer"
                      }`}
                      style={
                        !isEditing && isSelected
                          ? { backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }
                          : undefined
                      }
                    >
                      {/* Date */}
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium">
                        {m.date}
                      </td>

                      {/* Weight — crossfades between display and edit input */}
                      <td className="px-4 py-2 text-right">
                        <AnimatePresence mode="wait">
                          {isEditing ? (
                            <motion.div
                              key="edit"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              className="flex flex-col items-end gap-1"
                            >
                              <input
                                ref={inputRef}
                                type="number"
                                value={editWeight}
                                onChange={(e) => { setEditWeight(e.target.value); setEditError(null); }}
                                onKeyDown={(e) => handleKeyDown(e, m.date)}
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
                              transition={{ duration: 0.12 }}
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
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => saveEdit(m.date)}
                              disabled={saving}
                              title="Save"
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                            >
                              <Check size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={cancelEdit}
                              title="Cancel"
                            >
                              <X size={15} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => startEdit(m, e)}
                              title="Edit weight"
                              className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400"
                            >
                              <Pencil size={14} />
                            </Button>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
                                <Trash2 size={12} /> Selected
                              </span>
                            )}
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

        {/* Forms — 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <AddMeasurement onSuccess={bump} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <DeletePoint
              selectedPoint={selectedPoint}
              onSuccess={() => { bump(); setSelectedPoint(null); }}
            />
          </div>

          {/* CSV import panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Header / toggle */}
            <button
              onClick={() => {
                setCsvOpen((o) => {
                  // Reset the inner component when closing
                  if (o) setCsvKey((k) => k + 1);
                  return !o;
                });
              }}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <FileUp size={16} className="text-gray-400 dark:text-gray-500" />
                Import CSV
              </div>
              {csvOpen
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />
              }
            </button>

            {/* Collapsible body */}
            <AnimatePresence initial={false}>
              {csvOpen && (
                <motion.div
                  key="csv-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <CsvImport
                      key={csvKey}
                      onComplete={handleCsvComplete}
                      onBack={() => {
                        setCsvOpen(false);
                        setCsvKey((k) => k + 1);
                      }}
                      accent={accent}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
