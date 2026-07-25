/**
 * DeleteDoseModal — confirmation dialog for deleting a single medication dose.
 */

import { Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import type { MedicationDose } from "../../../lib/types";

interface DeleteDoseModalProps {
  target: MedicationDose | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function DeleteDoseModal({
  target,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteDoseModalProps) {
  const { t } = useTranslation("medication");
  const { formatDate } = useDisplayPreferences();
  return (
    <ConfirmModal
      open={!!target}
      onOpenChange={onOpenChange}
      title={t("deleteModal.title")}
      description={
        <Trans
          t={t}
          i18nKey="deleteModal.description"
          values={{
            medication: target?.medication,
            date: target == null ? "" : formatDate(target.date),
          }}
          components={{ strong: <strong /> }}
        />
      }
      confirmLabel={t("deleteModal.confirmLabel")}
      confirmVariant="destructive"
      confirmIcon={<Trash2 size={14} />}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
