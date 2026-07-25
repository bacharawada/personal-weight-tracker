/**
 * CsvTransferActions — the Import / Export CSV pair in a panel toolbar.
 *
 * Identical for both Data-page sections, so the two buttons and their
 * labels live in one place.
 */

import { useTranslation } from "react-i18next";
import { Download, FileUp } from "lucide-react";
import { Button } from "../../components/ui/button";

interface CsvTransferActionsProps {
  onImport: () => void;
  onExport: () => void;
  /** False when the dataset is empty — the export would return nothing. */
  canExport: boolean;
  isExporting: boolean;
}

export function CsvTransferActions({
  onImport,
  onExport,
  canExport,
  isExporting,
}: CsvTransferActionsProps) {
  const { t } = useTranslation("data");

  return (
    <>
      <Button variant="secondary" size="sm" onClick={onImport}>
        <FileUp size={15} />
        {t("actionCard.importTitle")}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onExport}
        disabled={!canExport || isExporting}
      >
        <Download size={15} />
        {t("toolbar.exportCsv")}
      </Button>
    </>
  );
}
