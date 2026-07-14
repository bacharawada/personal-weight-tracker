/**
 * AddMeasurementModal — dialog wrapper around the AddMeasurement form.
 */

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { AddMeasurement } from "../../../components/forms/AddMeasurement";

interface AddMeasurementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMeasurementModal({
  open,
  onOpenChange,
  onSuccess,
}: AddMeasurementModalProps) {
  const { t } = useTranslation("data");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addModal.title")}</DialogTitle>
          <DialogDescription>
            {t("addModal.description")}
          </DialogDescription>
        </DialogHeader>
        <AddMeasurement onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
