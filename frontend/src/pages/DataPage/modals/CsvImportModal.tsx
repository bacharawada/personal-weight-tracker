/**
 * CsvImportModal — dialog wrapper around the CsvImport component.
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
import type { CsvImportResult } from "../../../lib/types";

interface CsvImportModalProps {
  open: boolean;
  /** Called by onOpenChange — also handles key increment on close. */
  onOpenChange: (open: boolean) => void;
  /** Incremented on each close to force-reset CsvImport internal state. */
  csvKey: number;
  accent: string;
  onComplete: (result: CsvImportResult) => void;
  onBack: () => void;
}

export function CsvImportModal({
  open,
  onOpenChange,
  csvKey,
  accent,
  onComplete,
  onBack,
}: CsvImportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with <code>date</code> and <code>weight</code>{" "}
            columns. Delimiter and date format are detected automatically.
          </DialogDescription>
        </DialogHeader>
        <CsvImport
          key={csvKey}
          onComplete={onComplete}
          onBack={onBack}
          accent={accent}
        />
      </DialogContent>
    </Dialog>
  );
}
