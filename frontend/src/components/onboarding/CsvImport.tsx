/**
 * CsvImport — two-step CSV upload component.
 *
 * Step 1 (upload):  Drag-and-drop or file picker. Sends to /preview.
 * Step 2 (preview): Shows detected format, example, row count, first 10
 *                   rows in a table. User can confirm or go back.
 * Step 3 (result):  Shows inserted / skipped summary.
 *
 * On success calls onComplete() so the parent can advance the wizard.
 */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, CheckCircle, AlertCircle, ChevronLeft, FileText } from "lucide-react";
import { confirmCsvImport, previewCsv } from "../../lib/api";
import type { CsvImportResult, CsvPreview } from "../../lib/types";
import { Spinner } from "../ui/Spinner";

interface Props {
  onComplete: (result: CsvImportResult) => void;
  onBack: () => void;
  accent: string;
}

type Stage = "upload" | "previewing" | "preview" | "importing" | "done" | "error";

// Human-readable labels for common strptime format strings.
const FORMAT_LABELS: Record<string, string> = {
  "%Y-%m-%d": "YYYY-MM-DD (ISO 8601)",
  "%d/%m/%Y": "DD/MM/YYYY (European)",
  "%m/%d/%Y": "MM/DD/YYYY (US)",
  "%d-%m-%Y": "DD-MM-YYYY",
  "%m-%d-%Y": "MM-DD-YYYY",
  "%d.%m.%Y": "DD.MM.YYYY",
  "%Y/%m/%d": "YYYY/MM/DD",
};

export function CsvImport({ onComplete, onBack, accent }: Props) {
  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      setStage("error");
      return;
    }
    setStage("previewing");
    setError(null);
    try {
      const data = await previewCsv(file);
      setPreview(data);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setStage("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    setStage("importing");
    try {
      const res = await confirmCsvImport(preview.rows, preview.detected_date_format);
      setResult(res);
      setStage("done");
      onComplete(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStage("error");
    }
  }, [preview, onComplete]);

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {/* ---- Upload ---- */}
        {(stage === "upload" || stage === "previewing") && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-4"
          >
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3
                border-2 border-dashed rounded-xl p-10 cursor-pointer
                transition-colors duration-150
                ${isDragging
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                }
              `}
            >
              {stage === "previewing" ? (
                <Spinner size={28} color={accent} />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stage === "previewing" ? "Analysing file…" : "Drop your CSV here, or click to browse"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Two columns required: <code className="font-mono">date</code> and <code className="font-mono">weight</code>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Format hints */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p className="font-medium text-gray-600 dark:text-gray-300">Accepted formats</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Delimiter: comma, semicolon, or tab — auto-detected</li>
                <li>Decimal separator: period <code>83.5</code> or comma <code>83,5</code></li>
                <li>Date: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY — auto-detected</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* ---- Preview ---- */}
        {stage === "preview" && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-4"
          >
            {/* Metadata chips */}
            <div className="flex flex-wrap gap-2">
              <Chip label="Detected format" value={FORMAT_LABELS[preview.detected_date_format] ?? preview.detected_date_format} />
              <Chip label="Example" value={preview.date_format_example} />
              <Chip label="Total rows" value={String(preview.total_rows)} />
              {preview.skipped_rows > 0 && (
                <Chip label="Skipped (invalid)" value={String(preview.skipped_rows)} warn />
              )}
            </div>

            {/* Preview table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {preview.rows.map((row) => (
                    <tr key={row.date} className="bg-white dark:bg-gray-900">
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">{row.date}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.total_rows > preview.rows.length && (
                <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 text-center border-t border-gray-100 dark:border-gray-700">
                  Showing first {preview.rows.length} of {preview.total_rows} rows
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-between">
              <button
                onClick={() => { setPreview(null); setStage("upload"); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Choose another file
              </button>
              <button
                onClick={handleConfirm}
                style={{ backgroundColor: accent }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90"
              >
                <FileText className="w-4 h-4" />
                Import {preview.total_rows} rows
              </button>
            </div>
          </motion.div>
        )}

        {/* ---- Importing spinner ---- */}
        {stage === "importing" && (
          <motion.div
            key="importing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-10"
          >
            <Spinner size={32} color={accent} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Saving your data…</p>
          </motion.div>
        )}

        {/* ---- Done ---- */}
        {stage === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6 text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Import complete
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {result.inserted} measurement{result.inserted !== 1 ? "s" : ""} added
                {result.skipped_duplicates > 0 && `, ${result.skipped_duplicates} duplicate${result.skipped_duplicates !== 1 ? "s" : ""} skipped`}
                {result.skipped_invalid > 0 && `, ${result.skipped_invalid} invalid row${result.skipped_invalid !== 1 ? "s" : ""} skipped`}
              </p>
            </div>
          </motion.div>
        )}

        {/* ---- Error ---- */}
        {stage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Could not parse the file</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => { setError(null); setStage("upload"); }}
              className="self-start flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back link (always shown except on done) */}
      {stage !== "done" && stage !== "importing" && stage !== "preview" && (
        <button
          onClick={onBack}
          className="self-start text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline transition-colors"
        >
          Go back
        </button>
      )}
    </div>
  );
}

function Chip({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${warn
        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
      }
    `}>
      <span className="text-gray-400 dark:text-gray-500">{label}:</span>
      <span>{value}</span>
    </span>
  );
}
