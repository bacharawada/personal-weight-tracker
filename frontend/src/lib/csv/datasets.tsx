/**
 * CSV dataset descriptors.
 *
 * Everything that differs between importing/exporting weight measurements
 * and medication doses lives here: the endpoints, the preview columns, the
 * accepted-columns hint and the modal copy. The import flow itself
 * (CsvImport) and its modal are dataset-agnostic and take one of these.
 */

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  confirmCsvImport,
  confirmMedicationCsvImport,
  exportCsv,
  exportMedicationsCsv,
  previewCsv,
  previewMedicationCsv,
} from "../api";
import type {
  CsvImportResult,
  CsvPreviewColumn,
  CsvPreviewOf,
  CsvPreviewRow,
  MedicationCsvPreviewRow,
} from "../types";

export interface CsvDataset<TRow> {
  /** Uploads a file to the dataset's preview endpoint. */
  onPreview: (file: File) => Promise<CsvPreviewOf<TRow>>;
  /** Persists the reviewed rows. */
  onConfirm: (rows: TRow[], dateFormat: string) => Promise<CsvImportResult>;
  /** Downloads the dataset as CSV. */
  onExport: () => Promise<Blob>;
  /** Filename offered for the export download. */
  exportFilename: string;
  columns: CsvPreviewColumn<TRow>[];
  columnsHint: ReactNode;
  modalTitle: string;
  modalDescription: ReactNode;
}

export function useMeasurementCsvDataset(): CsvDataset<CsvPreviewRow> {
  const { t } = useTranslation("data");
  const { t: tOnboarding } = useTranslation("onboarding");

  return useMemo(
    () => ({
      onPreview: previewCsv,
      onConfirm: confirmCsvImport,
      onExport: exportCsv,
      exportFilename: "measurements.csv",
      columns: [
        {
          label: tOnboarding("csv.tableDate"),
          className: "font-mono text-xs",
          render: (row) => row.date,
        },
        {
          label: tOnboarding("csv.tableWeight"),
          align: "right",
          render: (row) => String(row.weight),
        },
      ],
      columnsHint: (
        <Trans
          t={tOnboarding}
          i18nKey="csv.columnsHint"
          components={[
            <code className="font-mono" />,
            <code className="font-mono" />,
          ]}
        />
      ),
      modalTitle: t("csvModal.title"),
      modalDescription: (
        <Trans t={t} i18nKey="csvModal.description" components={{ code: <code /> }} />
      ),
    }),
    [t, tOnboarding],
  );
}

export function useMedicationCsvDataset(): CsvDataset<MedicationCsvPreviewRow> {
  const { t } = useTranslation("medication");

  return useMemo(
    () => ({
      onPreview: previewMedicationCsv,
      onConfirm: confirmMedicationCsvImport,
      onExport: exportMedicationsCsv,
      exportFilename: "medications.csv",
      columns: [
        {
          label: t("table.date"),
          className: "font-mono text-xs",
          render: (row) => row.date,
        },
        {
          label: t("table.medication"),
          render: (row) => row.medication,
        },
        {
          label: t("table.dose"),
          align: "right",
          render: (row) =>
            row.dose_mg != null ? t("dose.mg", { value: row.dose_mg }) : t("dose.none"),
        },
        {
          label: t("table.note"),
          render: (row) => row.note ?? "",
        },
      ],
      columnsHint: (
        <Trans
          t={t}
          i18nKey="csvModal.columnsHint"
          components={[
            <code className="font-mono" />,
            <code className="font-mono" />,
            <code className="font-mono" />,
            <code className="font-mono" />,
          ]}
        />
      ),
      modalTitle: t("csvModal.title"),
      modalDescription: (
        <Trans t={t} i18nKey="csvModal.description" components={{ code: <code /> }} />
      ),
    }),
    [t],
  );
}
