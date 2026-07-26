/**
 * DeleteAllDosesModal — confirmation dialog for clearing the dose journal.
 */

import { Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";

interface DeleteAllDosesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  doseCount: number;
}

export function DeleteAllDosesModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
  doseCount,
}: DeleteAllDosesModalProps) {
  const { t } = useTranslation("medication");
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteAllModal.title")}
      description={
        <Trans
          t={t}
          i18nKey="deleteAllModal.description"
          count={doseCount}
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
