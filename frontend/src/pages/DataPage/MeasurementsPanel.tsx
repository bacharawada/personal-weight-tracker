/**
 * MeasurementsPanel — the "Weight measurements" section panel.
 *
 * Fills the shared DataSectionPanel skeleton with the measurements table,
 * the inline add form, CSV import/export and the delete-all control.
 */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, Scale, Trash2 } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { Button } from "../../components/ui/button";
import { AddMeasurement } from "../../components/forms/AddMeasurement";
import { exportCsv } from "../../lib/api";
import { unitLabel } from "../../lib/units";
import type { useDataPage } from "../../hooks/useDataPage";
import { DataSectionPanel } from "./DataSectionPanel";
import { MeasurementRow } from "./MeasurementRow";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteMeasurementModal } from "./modals/DeleteMeasurementModal";
import { DeleteAllModal } from "./modals/DeleteAllModal";

interface MeasurementsPanelProps {
  data: ReturnType<typeof useDataPage>;
  onBack: () => void;
}

export function MeasurementsPanel({ data, onBack }: MeasurementsPanelProps) {
  const { t } = useTranslation("data");
  const { bump, accent, hasData, unit } = useWeightTracker();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const {
    measurements,
    loading,
    csvOpen, csvKey, openCsvModal, closeCsvModal,
    deleteTarget, setDeleteTarget,
    deleteAllOpen, setDeleteAllOpen,
    editingDate, editWeight, setEditWeight, editNote, setEditNote, editError, setEditError,
    saving, inputRef,
    deleting, deletingAll,
    startEdit, cancelEdit, saveEdit, handleKeyDown,
    handleDelete, handleDeleteAll, handleCsvComplete,
  } = data;

  const columns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.weight", { unit: unitLabel(unit) }), align: "right" as const },
    { label: t("table.note"), align: "left" as const },
    { label: t("table.actions"), align: "right" as const, className: "w-24" },
  ];

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "measurements.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <>
      <DataSectionPanel
        icon={<Scale size={18} />}
        title={t("picker.measurementsTitle")}
        subtitle={t("page.subtitle", { count: measurements.length })}
        addLabel={t("panel.addEntry")}
        isFormOpen={isFormOpen}
        onFormOpenChange={setIsFormOpen}
        onBack={onBack}
        addForm={<AddMeasurement onSuccess={bump} />}
        toolbarActions={
          <Button variant="secondary" size="sm" onClick={openCsvModal}>
            <FileUp size={15} />
            {t("actionCard.importTitle")}
          </Button>
        }
        headerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!hasData || exporting}
            >
              <Download size={15} />
              <span className="hidden sm:inline">{t("toolbar.exportCsv")}</span>
            </Button>
            {hasData && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllOpen(true)}
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">{t("toolbar.deleteAll")}</span>
              </Button>
            )}
          </>
        }
        columns={columns}
        loading={loading}
        empty={
          <>
            <p>{t("table.empty")}</p>
            <button
              onClick={() => setIsFormOpen(true)}
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

      <CsvImportModal
        open={csvOpen}
        onOpenChange={closeCsvModal}
        csvKey={csvKey}
        accent={accent}
        onComplete={handleCsvComplete}
        onBack={() => closeCsvModal(false)}
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
