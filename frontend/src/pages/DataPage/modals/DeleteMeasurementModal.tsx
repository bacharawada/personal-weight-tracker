/**
 * DeleteMeasurementModal — confirmation dialog for deleting a single measurement.
 */

import { Trash2 } from "lucide-react";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";
import type { Measurement } from "../../../lib/types";

interface DeleteMeasurementModalProps {
  target: Measurement | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function DeleteMeasurementModal({
  target,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteMeasurementModalProps) {
  return (
    <ConfirmModal
      open={!!target}
      onOpenChange={onOpenChange}
      title="Delete measurement"
      description={
        <>
          Are you sure you want to delete the measurement for{" "}
          <strong>{target?.date}</strong> ({target?.weight} kg)? This cannot be
          undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmIcon={<Trash2 size={14} />}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
