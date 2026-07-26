/**
 * DataPage — side-by-side host for the two data sections.
 *
 * From xl both sections are on screen at once, splitting the width evenly.
 * Below that they stack and the page scrolls. With only two datasets, showing
 * both beats navigating between them: the previous rail and segmented control
 * each cost table width to answer a question the user never asked.
 */

import { useTranslation } from "react-i18next";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
import { useDataPage } from "../../hooks/useDataPage";
import { useMedicationDoses } from "../../hooks/useMedicationDoses";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { MedicationPanel } from "./MedicationPanel";

export function DataPage() {
  const { t } = useTranslation("data");
  const measurementsData = useDataPage();
  const medicationData = useMedicationDoses();

  return (
    <PageTransition>
      <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-4 pb-nav md:px-8 md:pt-8 md:pb-8 xl:overflow-hidden">
        <div className="shrink-0">
          <PageTitle
            title={t("page.title")}
            subtitle={t("page.subtitle", { count: measurementsData.measurements.length })}
          />
        </div>

        <div className="grid min-h-0 gap-5 xl:flex-1 xl:grid-cols-2">
          <div className="flex min-h-0 flex-col">
            <MeasurementsPanel data={measurementsData} />
          </div>
          <div className="flex min-h-0 flex-col">
            <MedicationPanel data={medicationData} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
