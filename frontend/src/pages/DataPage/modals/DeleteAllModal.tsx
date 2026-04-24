/**
 * DeleteAllModal — confirmation dialog for deleting all measurements.
 */

import { Trash2 } from "lucide-react";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";

interface DeleteAllModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  measurementCount: number;
}

export function DeleteAllModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
  measurementCount,
}: DeleteAllModalProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete all measurements"
      description={
        <>
          This will permanently delete all{" "}
          <strong>
            {measurementCount} measurement{measurementCount !== 1 ? "s" : ""}
          </strong>
          . This cannot be undone.
        </>
      }
      confirmLabel="Delete all"
      confirmVariant="destructive"
      confirmIcon={<Trash2 size={14} />}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
