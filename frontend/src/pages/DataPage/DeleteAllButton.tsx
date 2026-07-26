/**
 * DeleteAllButton — the destructive "wipe the section" control in a section
 * header.
 *
 * Opens a confirmation modal rather than deleting on click. Shared by both
 * sections, which is why the label lives in the `data` namespace.
 */

import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";

interface DeleteAllButtonProps {
  onClick: () => void;
}

export function DeleteAllButton({ onClick }: DeleteAllButtonProps) {
  const { t } = useTranslation("data");

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      aria-label={t("toolbar.deleteAll")}
    >
      <Trash2 size={15} />
      <span className="hidden sm:inline">{t("toolbar.deleteAll")}</span>
    </Button>
  );
}
