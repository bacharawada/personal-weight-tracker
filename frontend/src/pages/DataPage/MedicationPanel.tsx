/**
 * MedicationPanel — the "Medication" (GLP-1) section panel.
 *
 * Fills the shared DataSectionPanel skeleton with the dose journal, the
 * inline add-dose form and the delete-with-confirmation flow. Replaces the
 * former MedicationSection block that was stacked under the measurements
 * table.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Syringe } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { AddMedicationDose } from "../../components/forms/AddMedicationDose";
import type { useMedicationDoses } from "../../hooks/useMedicationDoses";
import { DataSectionPanel } from "./DataSectionPanel";
import { MedicationDoseRow } from "./MedicationDoseRow";
import { DeleteDoseModal } from "./modals/DeleteDoseModal";

interface MedicationPanelProps {
  data: ReturnType<typeof useMedicationDoses>;
  onBack: () => void;
}

export function MedicationPanel({ data, onBack }: MedicationPanelProps) {
  const { t } = useTranslation("medication");
  const { bump } = useWeightTracker();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { doses, loading, deleteTarget, setDeleteTarget, deleting, handleDelete } = data;

  const columns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.medication"), align: "left" as const },
    { label: t("table.dose"), align: "right" as const },
    { label: t("table.note"), align: "left" as const },
    { label: t("table.actions"), align: "right" as const, className: "w-16" },
  ];

  return (
    <>
      <DataSectionPanel
        icon={<Syringe size={18} />}
        title={t("section.title")}
        subtitle={t("section.subtitle", { count: doses.length })}
        addLabel={t("form.heading")}
        isFormOpen={isFormOpen}
        onFormOpenChange={setIsFormOpen}
        onBack={onBack}
        addForm={<AddMedicationDose onSuccess={bump} />}
        columns={columns}
        loading={loading}
        empty={
          <>
            <p>{t("section.empty")}</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-2 text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--color-accent)" }}
            >
              {t("form.heading")}
            </button>
          </>
        }
      >
        {doses.map((dose) => (
          <MedicationDoseRow
            key={dose.id}
            dose={dose}
            onDeleteRequest={setDeleteTarget}
          />
        ))}
      </DataSectionPanel>

      <DeleteDoseModal
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
