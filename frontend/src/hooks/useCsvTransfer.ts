/**
 * useCsvTransfer — CSV import-modal state and export download for one dataset.
 *
 * Both Data-page panels drive the same import modal and the same export
 * button, so the open/reset bookkeeping and the blob-to-download dance live
 * here instead of being written twice.
 */

import { useCallback, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import type { CsvDataset } from "../lib/csv/datasets";

/** Delay before the modal closes on success, so the summary stays readable. */
const SUCCESS_DISMISS_MS = 1800;

export function useCsvTransfer<TRow>(dataset: CsvDataset<TRow>) {
  const { bump } = useWeightTracker();

  const [isImportOpen, setIsImportOpen] = useState(false);
  // Bumped on every close so CsvImport remounts with a clean state.
  const [csvKey, setCsvKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const openImport = useCallback(() => setIsImportOpen(true), []);

  const setImportOpen = useCallback((open: boolean) => {
    if (!open) setCsvKey((k) => k + 1);
    setIsImportOpen(open);
  }, []);

  const handleImportComplete = useCallback(() => {
    bump();
    setTimeout(() => {
      setIsImportOpen(false);
      setCsvKey((k) => k + 1);
    }, SUCCESS_DISMISS_MS);
  }, [bump]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await dataset.onExport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dataset.exportFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [dataset]);

  return {
    isImportOpen,
    csvKey,
    openImport,
    setImportOpen,
    handleImportComplete,
    isExporting,
    handleExport,
  };
}
