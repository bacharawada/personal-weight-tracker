/**
 * DeleteMeasurementModal — confirmation dialog for deleting a single measurement.
 */

import { Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
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
  const { t } = useTranslation("data");
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
            date: target == null ? "" : formatDate(target.date),
            weight: target?.weight,
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
