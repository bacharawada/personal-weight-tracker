/**
 * MedicationPanel — the "Medication" (GLP-1) section.
 *
 * Fills the shared DataSectionPanel skeleton with the dose journal, the
 * add-dose dialog, CSV import/export and the delete-with-confirmation flow.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Syringe } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { AddMedicationDose } from "../../components/forms/AddMedicationDose";
import { useCsvTransfer } from "../../hooks/useCsvTransfer";
import { useMedicationCsvDataset } from "../../lib/csv/datasets";
import type { useMedicationDoses } from "../../hooks/useMedicationDoses";
import { DataSectionPanel } from "./DataSectionPanel";
import { SectionActionCards } from "./SectionActionCards";
import { ExportCsvButton } from "./ExportCsvButton";
import { DeleteAllButton } from "./DeleteAllButton";
import { MedicationDoseRow } from "./MedicationDoseRow";
import { AddEntryModal } from "./modals/AddEntryModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteDoseModal } from "./modals/DeleteDoseModal";
import { DeleteAllDosesModal } from "./modals/DeleteAllDosesModal";

interface MedicationPanelProps {
  data: ReturnType<typeof useMedicationDoses>;
}

export function MedicationPanel({ data }: MedicationPanelProps) {
  const { t } = useTranslation("medication");
  const { bump, accent } = useWeightTracker();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const dataset = useMedicationCsvDataset();
  const csv = useCsvTransfer(dataset);

  const {
    doses,
    loading,
    deleteTarget, setDeleteTarget,
    deleting, handleDelete,
    deleteAllOpen, setDeleteAllOpen,
    deletingAll, handleDeleteAll,
  } = data;
  const hasDoses = doses.length > 0;

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
        icon={<Syringe size={20} />}
        title={t("section.title")}
        subtitle={t("section.subtitle", { count: doses.length })}
        actions={
          <SectionActionCards
            addTitle={t("actionCard.addTitle")}
            addDescription={t("actionCard.addDescription")}
            onAdd={() => setIsAddOpen(true)}
            importTitle={t("actionCard.importTitle")}
            importDescription={t("actionCard.importDescription")}
            onImport={csv.openImport}
          />
        }
        headerActions={
          <>
            <ExportCsvButton
              onExport={csv.handleExport}
              canExport={hasDoses}
              isExporting={csv.isExporting}
            />
            {hasDoses && (
              <DeleteAllButton onClick={() => setDeleteAllOpen(true)} />
            )}
          </>
        }
        columns={columns}
        loading={loading}
        empty={
          <>
            <p>{t("section.empty")}</p>
            <button
              onClick={() => setIsAddOpen(true)}
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

      <AddEntryModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title={t("addModal.title")}
        description={t("addModal.description")}
      >
        <AddMedicationDose onSuccess={() => { bump(); setIsAddOpen(false); }} />
      </AddEntryModal>

      <CsvImportModal
        open={csv.isImportOpen}
        onOpenChange={csv.setImportOpen}
        csvKey={csv.csvKey}
        accent={accent}
        dataset={dataset}
        onComplete={csv.handleImportComplete}
        onBack={() => csv.setImportOpen(false)}
      />

      <DeleteDoseModal
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <DeleteAllDosesModal
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAll}
        loading={deletingAll}
        doseCount={doses.length}
      />
    </>
  );
}
