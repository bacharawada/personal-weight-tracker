/**
 * MedicationSection — the "Medication" block on the Data page.
 *
 * Lists the user's logged GLP-1 (and similar) doses, offers an add form
 * (with molecule suggestions) and a delete-with-confirmation flow, mirroring
 * the measurements block's layout and interaction patterns.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Syringe } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { DataTable } from "../../components/ui/DataTable";
import { AddMedicationDose } from "../../components/forms/AddMedicationDose";
import { deleteMedicationDose, getMedications } from "../../lib/api";
import type { MedicationDose } from "../../lib/types";
import { MedicationDoseRow } from "./MedicationDoseRow";
import { DeleteDoseModal } from "./modals/DeleteDoseModal";

export function MedicationSection() {
  const { t } = useTranslation("medication");
  const { refreshKey, bump } = useWeightTracker();

  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MedicationDose | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // `loading` starts true; setState here stays inside async callbacks so the
    // effect body itself performs no synchronous state update.
    getMedications()
      .then(setDoses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMedicationDose(deleteTarget.id);
      setDeleteTarget(null);
      bump();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, bump]);

  const columns = [
    { label: t("table.date"), align: "left" as const },
    { label: t("table.medication"), align: "left" as const },
    { label: t("table.dose"), align: "right" as const },
    { label: t("table.note"), align: "left" as const },
    { label: t("table.actions"), align: "right" as const, className: "w-16" },
  ];

  return (
    <section className="max-w-4xl mx-auto w-full space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white shrink-0"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          <Syringe size={18} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("section.title")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("section.subtitle", { count: doses.length })}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col max-h-[50vh] bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <DataTable
            columns={columns}
            loading={loading}
            empty={<p>{t("section.empty")}</p>}
          >
            {doses.map((dose) => (
              <MedicationDoseRow
                key={dose.id}
                dose={dose}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
          </DataTable>
        </div>

        <div className="w-full md:w-72 shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("form.heading")}
          </h3>
          <AddMedicationDose onSuccess={bump} />
        </div>
      </div>

      <DeleteDoseModal
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </section>
  );
}
