/**
 * DeleteAllModal — confirmation dialog for deleting all measurements.
 */

import { Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation("data");
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteAllModal.title")}
      description={
        <Trans
          t={t}
          i18nKey="deleteAllModal.description"
          count={measurementCount}
          components={{ strong: <strong /> }}
        />
      }
      confirmLabel={t("deleteAllModal.confirmLabel")}
      confirmVariant="destructive"
      confirmIcon={<Trash2 size={14} />}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
