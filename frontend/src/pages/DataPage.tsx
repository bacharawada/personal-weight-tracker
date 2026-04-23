import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { AddMeasurement } from "../components/forms/AddMeasurement";
import { DeletePoint } from "../components/forms/DeletePoint";
import { getMeasurements, updateMeasurement, exportCsvUrl } from "../lib/api";
import type { Measurement } from "../lib/types";
import { getPaletteAccent } from "../lib/palette";
import { Spinner } from "../components/ui/Spinner";
import { Check, Download, Pencil, Trash2, X } from "lucide-react";

export function DataPage() {
  const { refreshKey, bump, selectedPoint, setSelectedPoint, hasData, chartParams } = useWeightTracker();
  const accent = getPaletteAccent(chartParams.palette);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <PageTransition>
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <PageTitle
          title="Data"
          subtitle={`${measurements.length} measurement${measurements.length !== 1 ? "s" : ""} recorded`}
        />
        <a
          href={hasData ? exportCsvUrl() : undefined}
          download="measurements.csv"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-50 dark:bg-gray-800 text-gray-400 pointer-events-none"
          }`}
        >
          <Download size={16} /> Export CSV
        </a>
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
                          ? { backgroundColor: `${accent}18` }
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
                            <button
                              onClick={() => saveEdit(m.date)}
                              disabled={saving}
                              title="Save"
                              className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-40 transition-colors"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              title="Cancel"
                              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => startEdit(m, e)}
                              title="Edit weight"
                              className="p-1.5 rounded-md text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: accent }}>
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
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
