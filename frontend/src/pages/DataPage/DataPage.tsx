import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
import { Button } from "../../components/ui/button";
import { ActionCard } from "../../components/ui/ActionCard";
import { DataTable } from "../../components/ui/DataTable";
import { exportCsv } from "../../lib/api";
import { useDataPage } from "../../hooks/useDataPage";
import { MeasurementRow } from "./MeasurementRow";
import { MedicationSection } from "./MedicationSection";
import { DataPageFAB } from "./DataPageFAB";
import { AddMeasurementModal } from "./modals/AddMeasurementModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteMeasurementModal } from "./modals/DeleteMeasurementModal";
import { DeleteAllModal } from "./modals/DeleteAllModal";
import { unitLabel } from "../../lib/units";

export function DataPage() {
  const { t } = useTranslation("data");
  const { bump, accent, hasData, unit } = useWeightTracker();
  const tableColumns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.weight", { unit: unitLabel(unit) }), align: "right" as const },
    { label: t("table.actions"), align: "right" as const, className: "w-24" },
  ];
  const {
    measurements,
    loading,
    addOpen, setAddOpen,
    csvOpen, csvKey, openCsvModal, closeCsvModal,
    deleteTarget, setDeleteTarget,
    deleteAllOpen, setDeleteAllOpen,
    editingDate, editWeight, setEditWeight, editError, setEditError,
    saving, inputRef,
    deleting, deletingAll,
    startEdit, cancelEdit, saveEdit, handleKeyDown,
    handleDelete, handleDeleteAll, handleCsvComplete,
  } = useDataPage();

  const [exporting, setExporting] = useState(false);
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
      <PageTransition>
        <div className="h-full overflow-y-auto px-4 pt-4 pb-nav md:px-8 md:pt-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
            <PageTitle
              title={t("page.title")}
              subtitle={t("page.subtitle", { count: measurements.length })}
            />
            <div className="flex items-center gap-2 shrink-0">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={!hasData || exporting}
              >
                <Download size={15} />
                <span className="hidden sm:inline">{t("toolbar.exportCsv")}</span>
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex gap-5 items-start">

              {/* Table — full width on mobile, flex-1 on desktop */}
              <div className="flex-1 min-w-0 flex flex-col max-h-[55vh] bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <DataTable
                  columns={tableColumns}
                  loading={loading}
                  empty={
                    <>
                      <p>{t("table.empty")}</p>
                      <button
                        onClick={() => setAddOpen(true)}
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
                      editError={editError}
                      saving={saving}
                      inputRef={inputRef}
                      onEditStart={startEdit}
                      onEditSave={saveEdit}
                      onEditCancel={cancelEdit}
                      onKeyDown={handleKeyDown}
                      onWeightChange={setEditWeight}
                      onErrorClear={() => setEditError(null)}
                      onDeleteRequest={setDeleteTarget}
                    />
                  ))}
                </DataTable>
              </div>

              {/* Action cards — desktop only */}
              <div className="hidden md:flex flex-col gap-3 w-72 shrink-0">
                <ActionCard
                  icon={<Plus size={18} />}
                  title={t("actionCard.addTitle")}
                  description={t("actionCard.addDescription")}
                  onClick={() => setAddOpen(true)}
                />
                <ActionCard
                  icon={<FileUp size={18} />}
                  title={t("actionCard.importTitle")}
                  description={t("actionCard.importDescription")}
                  onClick={openCsvModal}
                />
              </div>

            </div>
          </div>

          {/* Medication (GLP-1) dose journal */}
          <MedicationSection />
        </div>
      </PageTransition>

      <AddMeasurementModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => { bump(); setAddOpen(false); }}
      />

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

      {/* FAB — mobile only, positioned above bottom tab bar */}
      <DataPageFAB
        onAdd={() => setAddOpen(true)}
        onImport={openCsvModal}
      />
    </>
  );
}
