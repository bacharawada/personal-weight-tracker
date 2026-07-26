/**
 * useMedicationDoses — medication-dose list state for the Data page.
 *
 * Extracted from the former MedicationSection component so the Data page
 * can show the dose count on the section card while the medication panel
 * itself is not mounted.
 */

import { useCallback, useEffect, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import {
  deleteAllMedicationDoses,
  deleteMedicationDose,
  getMedications,
} from "../lib/api";
import type { MedicationDose } from "../lib/types";

export function useMedicationDoses() {
  const { refreshKey, bump } = useWeightTracker();

  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MedicationDose | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    // `loading` starts true; setState here stays inside async callbacks so the
    // effect body itself performs no synchronous state update.
    getMedications()
      .then(setDoses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMedicationDose(deleteTarget.id);
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
      await deleteAllMedicationDoses();
      setDeleteAllOpen(false);
      bump();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeletingAll(false);
    }
  }, [bump]);

  return {
    doses,
    loading,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    deleteAllOpen,
    setDeleteAllOpen,
    deletingAll,
    handleDeleteAll,
  };
}
