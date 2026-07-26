/**
 * ExportCsvButton — the discreet CSV export control in a section header.
 *
 * Import is an icon card because it starts a flow; export is one click on an
 * existing dataset, so it stays a quiet header button. Shared by both
 * sections, which is why the label lives in the `data` namespace.
 */

import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "../../components/ui/button";

interface ExportCsvButtonProps {
  onExport: () => void;
  /** False when the dataset is empty — the export would return nothing. */
  canExport: boolean;
  isExporting: boolean;
}

export function ExportCsvButton({
  onExport,
  canExport,
  isExporting,
}: ExportCsvButtonProps) {
  const { t } = useTranslation("data");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onExport}
      disabled={!canExport || isExporting}
      aria-label={t("toolbar.exportCsv")}
    >
      <Download size={15} />
      <span className="hidden sm:inline">{t("toolbar.exportCsv")}</span>
    </Button>
  );
}
