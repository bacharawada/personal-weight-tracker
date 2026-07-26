/**
 * MeasurementsPanel — the "Weight measurements" section panel.
 *
 * Fills the shared DataSectionPanel skeleton with the measurements table,
 * the add dialog, CSV import/export and the delete-all control.
 */

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { Button } from "../../components/ui/button";
import { AddMeasurement } from "../../components/forms/AddMeasurement";
import { useCsvTransfer } from "../../hooks/useCsvTransfer";
import { useMeasurementCsvDataset } from "../../lib/csv/datasets";
import { unitLabel } from "../../lib/units";
import type { useDataPage } from "../../hooks/useDataPage";
import { DataSectionPanel } from "./DataSectionPanel";
import { CsvTransferActions } from "./CsvTransferActions";
import { MeasurementRow } from "./MeasurementRow";
import { AddEntryModal } from "./modals/AddEntryModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteMeasurementModal } from "./modals/DeleteMeasurementModal";
import { DeleteAllModal } from "./modals/DeleteAllModal";

interface MeasurementsPanelProps {
  data: ReturnType<typeof useDataPage>;
  onBack: () => void;
  /** Desktop section switcher, rendered in the panel header. */
  switcher?: ReactNode;
}

export function MeasurementsPanel({ data, onBack, switcher }: MeasurementsPanelProps) {
  const { t } = useTranslation("data");
  const { bump, accent, hasData, unit } = useWeightTracker();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const dataset = useMeasurementCsvDataset();
  const csv = useCsvTransfer(dataset);

  const {
    measurements,
    loading,
    deleteTarget, setDeleteTarget,
    deleteAllOpen, setDeleteAllOpen,
    editingDate, editWeight, setEditWeight, editNote, setEditNote, editError, setEditError,
    saving, inputRef,
    deleting, deletingAll,
    startEdit, cancelEdit, saveEdit, handleKeyDown,
    handleDelete, handleDeleteAll,
  } = data;

  const columns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.weight", { unit: unitLabel(unit) }), align: "right" as const },
    { label: t("table.note"), align: "left" as const },
    { label: t("table.actions"), align: "right" as const, className: "w-24" },
  ];

  return (
    <>
      <DataSectionPanel
        title={t("picker.measurementsTitle")}
        subtitle={t("page.subtitle", { count: measurements.length })}
        addLabel={t("panel.addEntry")}
        onAdd={() => setIsAddOpen(true)}
        onBack={onBack}
        switcher={switcher}
        toolbarActions={
          <CsvTransferActions
            onImport={csv.openImport}
            onExport={csv.handleExport}
            canExport={hasData}
            isExporting={csv.isExporting}
          />
        }
        headerActions={
          hasData && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">{t("toolbar.deleteAll")}</span>
            </Button>
          )
        }
        columns={columns}
        loading={loading}
        empty={
          <>
            <p>{t("table.empty")}</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--color-accent)" }}
            >
              {t("table.addFirst")}
            </button>
          </>
        }
      >
        {measurements.map((m) => (
          <MeasurementRow
            key={m.date}
            measurement={m}
            unit={unit}
            isEditing={editingDate === m.date}
            editWeight={editWeight}
            editNote={editNote}
            editError={editError}
            saving={saving}
            inputRef={inputRef}
            onEditStart={startEdit}
            onEditSave={saveEdit}
            onEditCancel={cancelEdit}
            onKeyDown={handleKeyDown}
            onWeightChange={setEditWeight}
            onNoteChange={setEditNote}
            onErrorClear={() => setEditError(null)}
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
        <AddMeasurement onSuccess={() => { bump(); setIsAddOpen(false); }} />
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

      <DeleteMeasurementModal
        target={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <DeleteAllModal
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAll}
        loading={deletingAll}
        measurementCount={measurements.length}
      />
    </>
  );
}
