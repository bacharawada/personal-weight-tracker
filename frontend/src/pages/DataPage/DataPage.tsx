import { Download, FileUp, Plus, Trash2 } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
import { Button } from "../../components/ui/button";
import { ActionCard } from "../../components/ui/ActionCard";
import { DataTable } from "../../components/ui/DataTable";
import { exportCsvUrl } from "../../lib/api";
import { useDataPage } from "../../hooks/useDataPage";
import { MeasurementRow } from "./MeasurementRow";
import { DataPageFAB } from "./DataPageFAB";
import { AddMeasurementModal } from "./modals/AddMeasurementModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { DeleteMeasurementModal } from "./modals/DeleteMeasurementModal";
import { DeleteAllModal } from "./modals/DeleteAllModal";

const TABLE_COLUMNS = [
  { label: "Date", align: "left" as const },
  { label: "Weight (kg)", align: "right" as const },
  { label: "Actions", align: "right" as const, className: "w-24" },
];

export function DataPage() {
  const { bump, accent, hasData } = useWeightTracker();
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

  return (
    <>
      <PageTransition>
        <div className="h-full flex flex-col px-4 pt-4 pb-4 md:px-8 md:pt-8 gap-4 md:gap-6 min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 shrink-0">
            <PageTitle
              title="Data"
              subtitle={`${measurements.length} measurement${measurements.length !== 1 ? "s" : ""} recorded`}
            />
            <div className="flex items-center gap-2 shrink-0">
              {hasData && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <Trash2 size={15} />
                  <span className="hidden sm:inline">Delete all</span>
                </Button>
              )}
              <a
                href={hasData ? exportCsvUrl() : undefined}
                download={hasData ? "measurements.csv" : undefined}
                aria-disabled={!hasData}
                className={[
                  "inline-flex items-center gap-2 h-9 rounded-md px-3 text-sm font-medium",
                  "border border-input bg-background transition-colors",
                  hasData
                    ? "hover:bg-muted dark:hover:bg-muted/50 text-foreground cursor-pointer"
                    : "opacity-50 pointer-events-none text-foreground",
                ].join(" ")}
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export CSV</span>
              </a>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 max-w-4xl mx-auto w-full">
            <div className="flex gap-5 h-full items-start">

              {/* Table — full width on mobile, flex-1 on desktop */}
              <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <DataTable
                  columns={TABLE_COLUMNS}
                  loading={loading}
                  empty={
                    <>
                      <p>No measurements yet.</p>
                      <button
                        onClick={() => setAddOpen(true)}
                        className="mt-2 text-sm font-medium underline underline-offset-2"
                        style={{ color: "var(--color-accent)" }}
                      >
                        Add your first one
                      </button>
                    </>
                  }
                >
                  {measurements.map((m) => (
                    <MeasurementRow
                      key={m.date}
                      measurement={m}
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
                  title="Add entry"
                  description="Log a new measurement"
                  onClick={() => setAddOpen(true)}
                />
                <ActionCard
                  icon={<FileUp size={18} />}
                  title="Import CSV"
                  description="Upload from a file"
                  onClick={openCsvModal}
                />
              </div>

            </div>
          </div>
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
