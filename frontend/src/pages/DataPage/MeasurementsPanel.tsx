/**
 * MeasurementsPanel — the "Weight measurements" section.
 *
 * Fills the shared DataSectionPanel skeleton with the measurements table,
 * the add dialog, CSV import/export and the delete-all control.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { AddMeasurement } from "../../components/forms/AddMeasurement";
import { useCsvTransfer } from "../../hooks/useCsvTransfer";
import { useMeasurementCsvDataset } from "../../lib/csv/datasets";
import { unitLabel } from "../../lib/units";
import type { useDataPage } from "../../hooks/useDataPage";
import { DataSectionPanel } from "./DataSectionPanel";
import { SectionActionCards } from "./SectionActionCards";
import { ExportCsvButton } from "./ExportCsvButton";
import { DeleteAllButton } from "./DeleteAllButton";
import { MeasurementRow } from "./MeasurementRow";
import { AddEntryModal } from "./modals/AddEntryModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteMeasurementModal } from "./modals/DeleteMeasurementModal";
import { DeleteAllModal } from "./modals/DeleteAllModal";

interface MeasurementsPanelProps {
  data: ReturnType<typeof useDataPage>;
}

export function MeasurementsPanel({ data }: MeasurementsPanelProps) {
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

  // `hidden sm:table-cell` mirrors MeasurementRow: below sm only date, weight
  // and actions fit, and the note moves into the row's own second line.
  const columns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.weight", { unit: unitLabel(unit) }), align: "right" as const },
    { label: t("table.delta"), align: "right" as const, className: "hidden sm:table-cell" },
    { label: t("table.note"), align: "left" as const, className: "hidden sm:table-cell" },
    { label: t("table.actions"), align: "right" as const, className: "w-24" },
  ];

  return (
    <>
      <DataSectionPanel
        icon={<Scale size={20} />}
        title={t("picker.measurementsTitle")}
        subtitle={t("page.subtitle", { count: measurements.length })}
        actions={
          <SectionActionCards
            addTitle={t("actionCard.addTitle")}
            addDescription={t("actionCard.addDescription")}
            addShortTitle={t("actionCard.addShort")}
            onAdd={() => setIsAddOpen(true)}
            importTitle={t("actionCard.importTitle")}
            importDescription={t("actionCard.importDescription")}
            importShortTitle={t("actionCard.importShort")}
            onImport={csv.openImport}
          />
        }
        headerActions={
          <>
            <ExportCsvButton
              onExport={csv.handleExport}
              canExport={hasData}
              isExporting={csv.isExporting}
            />
            {hasData && (
              <DeleteAllButton onClick={() => setDeleteAllOpen(true)} />
            )}
          </>
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
        {measurements.map((m, index) => (
          <MeasurementRow
            key={m.date}
            measurement={m}
            // Rows are oldest-first, so the row above holds the earlier weight.
            deltaKg={index === 0 ? null : m.weight - measurements[index - 1].weight}
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
