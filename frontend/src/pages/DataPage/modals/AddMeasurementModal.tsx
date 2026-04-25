/**
 * AddMeasurementModal — dialog wrapper around the AddMeasurement form.
 */

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add measurement</DialogTitle>
          <DialogDescription>
            Enter a date and your weight in kilograms.
          </DialogDescription>
        </DialogHeader>
        <AddMeasurement onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
