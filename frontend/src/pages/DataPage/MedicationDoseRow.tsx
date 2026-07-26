/**
 * MedicationDoseRow — a single row in the medication-dose table.
 *
 * Read-only row (date, molecule, dose, note) with a hover-revealed delete
 * action, mirroring MeasurementRow's interaction pattern.
 *
 * Below sm the note column is dropped and the note becomes a second line under
 * the molecule — on a phone vertical space is cheaper than horizontal.
 */

import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import type { MedicationDose } from "../../lib/types";

interface MedicationDoseRowProps {
  dose: MedicationDose;
  onDeleteRequest: (dose: MedicationDose) => void;
}

export function MedicationDoseRow({
  dose,
  onDeleteRequest,
}: MedicationDoseRowProps) {
  const { t } = useTranslation("medication");
  const { formatDate } = useDisplayPreferences();
  return (
    <tr className="group transition-colors">
      <td className="px-2.5 py-2.5 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap sm:px-4">
        {formatDate(dose.date)}
      </td>
      <td className="px-2.5 py-2.5 text-gray-900 dark:text-gray-100 sm:px-4">
        <span className="block">{dose.medication}</span>
        {dose.note && (
          <span
            title={dose.note}
            className="mt-0.5 block max-w-[8rem] truncate text-xs font-normal text-gray-500 dark:text-gray-400 sm:hidden"
          >
            {dose.note}
          </span>
        )}
      </td>
      <td className="px-2.5 py-2.5 text-right font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap sm:px-4">
        {dose.dose_mg != null
          ? t("dose.mg", { value: dose.dose_mg })
          : t("dose.none")}
      </td>
      <td className="hidden px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-[16rem] truncate sm:table-cell">
        {dose.note ?? ""}
      </td>
      <td className="px-1.5 py-2.5 text-right sm:px-4">
        <div className="flex items-center justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDeleteRequest(dose)}
            title={t("actions.delete", { ns: "common" })}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );
}
