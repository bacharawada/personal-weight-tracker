/**
 * DataPage — host for the two data sections.
 *
 * From xl both sections are on screen at once, splitting the width evenly.
 * Below that only one section fits, so a tab bar gates which one shows: the
 * previous stacked layout buried the medication section under a long
 * measurement list and forced the page to scroll on top of the tables.
 *
 * Both panels stay mounted at every breakpoint — the inactive one is only
 * display:none — so switching tabs keeps each section's dialog and CSV state.
 *
 * The page itself never scrolls: title and tabs are fixed, the active card
 * fills the rest and its table scrolls inside it.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/ui/segmented-control";
import { useDataPage } from "../../hooks/useDataPage";
import { useMedicationDoses } from "../../hooks/useMedicationDoses";
import { DataSection } from "../../lib/types";
import { cn } from "../../lib/cn";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { MedicationPanel } from "./MedicationPanel";

export function DataPage() {
  const { t } = useTranslation("data");
  const measurementsData = useDataPage();
  const medicationData = useMedicationDoses();
  const [activeSection, setActiveSection] = useState<DataSection>(
    DataSection.Measurements,
  );

  const tabs: readonly SegmentedControlOption<DataSection>[] = [
    { value: DataSection.Measurements, label: t("tabs.measurements") },
    { value: DataSection.Medication, label: t("tabs.medication") },
  ];

  /** Hidden below xl unless active; from xl both cells are always shown. */
  const cellClass = (section: DataSection) =>
    cn(
      "min-h-0 flex-col xl:flex",
      activeSection === section ? "flex" : "hidden",
    );

  // The title stands for the whole page, so its subtitle counts both datasets —
  // the per-section totals live in each card's own header.
  const subtitle = [
    t("page.countMeasurements", { count: measurementsData.measurements.length }),
    t("section.countDoses", { ns: "medication", count: medicationData.doses.length }),
  ].join(" · ");

  return (
    <PageTransition>
      {/*
        AppShell's <main> already reserves the mobile tab bar's 4rem, so only the
        iOS safe-area inset and a little breathing room are missing here — and
        with the page locked to the viewport the usual pb-nav would leave a dead
        band above the bar.
      */}
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:gap-5 md:px-8 md:pt-8 md:pb-8">
        <div className="shrink-0">
          <PageTitle title={t("page.title")} subtitle={subtitle} />
        </div>

        <div className="shrink-0 xl:hidden">
          <SegmentedControl
            options={tabs}
            value={activeSection}
            onChange={setActiveSection}
            ariaLabel={t("tabs.ariaLabel")}
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
          <div className={cellClass(DataSection.Measurements)}>
            <MeasurementsPanel data={measurementsData} />
          </div>
          <div className={cellClass(DataSection.Medication)}>
            <MedicationPanel data={medicationData} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
