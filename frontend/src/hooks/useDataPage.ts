/**
 * useDataPage — state and logic for the Data page.
 *
 * Extracts measurements CRUD, inline-edit state machine and modal open
 * states out of DataPage.tsx so the page component stays a thin renderer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import {
  getMeasurements,
  updateMeasurement,
  deleteMeasurement,
  deleteAllMeasurements,
} from "../lib/api";
import type { CsvImportResult, Measurement } from "../lib/types";

export function useDataPage() {
  const { refreshKey, bump } = useWeightTracker();

  // ── Data ────────────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMeasurements()
      .then(setMeasurements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // ── Modal open state ─────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKey, setCsvKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Measurement | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  // ── Inline edit state ────────────────────────────────────────────────────
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the edit input as soon as editing starts
  useEffect(() => {
    if (editingDate && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDate]);

  // ── Delete single row ────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // ── Callbacks ────────────────────────────────────────────────────────────
  const startEdit = useCallback((m: Measurement, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(null);
    setEditingDate(m.date);
    setEditWeight(String(m.weight));
    setEditError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingDate(null);
    setEditWeight("");
    setEditError(null);
  }, []);

  const saveEdit = useCallback(
    async (date: string) => {
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
    },
    [editWeight, bump],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: string) => {
      if (e.key === "Enter") saveEdit(date);
      if (e.key === "Escape") cancelEdit();
    },
    [saveEdit, cancelEdit],
  );

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

  const handleDeleteAll = useCallback(async () => {
    setDeletingAll(true);
    try {
      await deleteAllMeasurements();
      setDeleteAllOpen(false);
      bump();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeletingAll(false);
    }
  }, [bump]);

  const handleCsvComplete = useCallback(
    (_result: CsvImportResult) => {
      bump();
      setTimeout(() => {
        setCsvOpen(false);
        setCsvKey((k) => k + 1);
      }, 1800);
    },
    [bump],
  );

  const openCsvModal = useCallback(() => setCsvOpen(true), []);
  const closeCsvModal = useCallback((open: boolean) => {
    if (!open) setCsvKey((k) => k + 1);
    setCsvOpen(open);
  }, []);

  return {
    // Data
    measurements,
    loading,
    // Modal state
    addOpen,
    setAddOpen,
    csvOpen,
    csvKey,
    openCsvModal,
    closeCsvModal,
    deleteTarget,
    setDeleteTarget,
    deleteAllOpen,
    setDeleteAllOpen,
    // Inline edit state
    editingDate,
    editWeight,
    setEditWeight,
    editError,
    setEditError,
    saving,
    inputRef,
    // Delete state
    deleting,
    deletingAll,
    // Callbacks
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    handleDelete,
    handleDeleteAll,
    handleCsvComplete,
  };
}
