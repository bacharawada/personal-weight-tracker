/**
 * CsvImportModal — dialog wrapper around the CsvImport component.
 *
 * Dataset-agnostic: the title, description, endpoints and preview columns
 * all come from the CsvDataset descriptor it is given.
 *
 * The csvKey prop forces a full component remount on each open so that
 * CsvImport's internal state is cleanly reset.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { CsvImport } from "../../../components/onboarding/CsvImport";
import type { CsvDataset } from "../../../lib/csv/datasets";
import type { CsvImportResult } from "../../../lib/types";

interface CsvImportModalProps<TRow> {
  open: boolean;
  /** Called by onOpenChange — also handles key increment on close. */
  onOpenChange: (open: boolean) => void;
  /** Incremented on each close to force-reset CsvImport internal state. */
  csvKey: number;
  accent: string;
  dataset: CsvDataset<TRow>;
  onComplete: (result: CsvImportResult) => void;
  onBack: () => void;
}

export function CsvImportModal<TRow>({
  open,
  onOpenChange,
  csvKey,
  accent,
  dataset,
  onComplete,
  onBack,
}: CsvImportModalProps<TRow>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dataset.modalTitle}</DialogTitle>
          <DialogDescription>{dataset.modalDescription}</DialogDescription>
        </DialogHeader>
        <CsvImport
          key={csvKey}
          onPreview={dataset.onPreview}
          onConfirm={dataset.onConfirm}
          columns={dataset.columns}
          columnsHint={dataset.columnsHint}
          onComplete={onComplete}
          onBack={onBack}
          accent={accent}
        />
      </DialogContent>
    </Dialog>
  );
}
