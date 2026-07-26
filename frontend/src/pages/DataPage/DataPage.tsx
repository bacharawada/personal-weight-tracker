/**
 * DataPage — single-panel host for the data sections.
 *
 * Desktop (md+): a segmented control picks the section, whose panel then gets
 * the full page width. Two sections don't earn a persistent side rail — it
 * cost ~290px of table width and sat empty below its two cards.
 * Mobile: master-detail drill-down — the section cards fill the screen until
 * one is picked, then the panel replaces them (its own back button returns).
 *
 * The split is pure CSS. `selected` only seeds the initial state from the
 * viewport width — null on mobile so the cards show first, measurements on
 * desktop so a panel is up immediately. Later resizes need no listener: the
 * card and panel visibility are breakpoint classes, and the panel falls back
 * to the measurements section whenever nothing is selected.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Scale, Syringe } from "lucide-react";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
import { SegmentedControl } from "../../components/ui/segmented-control";
import { useDataPage } from "../../hooks/useDataPage";
import { useMedicationDoses } from "../../hooks/useMedicationDoses";
import { cn } from "../../lib/cn";
import { DataSectionCard } from "./DataSectionCard";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { MedicationPanel } from "./MedicationPanel";

const SECTIONS = {
  measurements: "measurements",
  medication: "medication",
} as const;

type Section = (typeof SECTIONS)[keyof typeof SECTIONS];

/** Tailwind's `md` breakpoint — the point where both panes fit side by side. */
const TWO_PANE_QUERY = "(min-width: 768px)";

function initialSection(): Section | null {
  return window.matchMedia(TWO_PANE_QUERY).matches
    ? SECTIONS.measurements
    : null;
}

export function DataPage() {
  const { t } = useTranslation("data");
  const measurementsData = useDataPage();
  const medicationData = useMedicationDoses();

  const [selected, setSelected] = useState<Section | null>(initialSection);
  const active: Section = selected ?? SECTIONS.measurements;

  const measurementCount = measurementsData.measurements.length;
  const doseCount = medicationData.doses.length;

  // Lives in the active panel's header rather than on the page, so switching
  // sections costs no vertical space of its own. Desktop only — mobile reaches
  // a panel through the cards below and never has two sections in reach.
  const switcher = (
    <SegmentedControl
      options={[
        { value: SECTIONS.measurements, label: t("picker.measurementsTitle") },
        { value: SECTIONS.medication, label: t("section.title", { ns: "medication" }) },
      ]}
      value={active}
      onChange={setSelected}
      ariaLabel={t("picker.ariaLabel")}
    />
  );

  return (
    <PageTransition>
      <div className="flex h-full flex-col gap-5 overflow-hidden px-4 pt-4 pb-nav md:px-8 md:pt-8">

        {/* Page heading — hidden on mobile once a panel is open */}
        <div className={cn("shrink-0", selected && "hidden md:block")}>
          <PageTitle
            title={t("page.title")}
            subtitle={t("page.subtitle", { count: measurementCount })}
          />
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Section cards — mobile master view */}
          <div
            className={cn(
              "w-full shrink-0 flex-col gap-3 md:hidden",
              selected ? "hidden" : "flex",
            )}
          >
            <DataSectionCard
              icon={<Scale size={22} />}
              title={t("picker.measurementsTitle")}
              subtitle={t("page.subtitle", { count: measurementCount })}
              onClick={() => setSelected(SECTIONS.measurements)}
            />
            <DataSectionCard
              icon={<Syringe size={22} />}
              title={t("section.title", { ns: "medication" })}
              subtitle={t("section.subtitle", {
                ns: "medication",
                count: doseCount,
              })}
              onClick={() => setSelected(SECTIONS.medication)}
            />
          </div>

          {/* Detail panel */}
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "min-w-0 flex-1 flex-col",
              selected ? "flex" : "hidden md:flex",
            )}
          >
            {active === SECTIONS.measurements ? (
              <MeasurementsPanel
                data={measurementsData}
                onBack={() => setSelected(null)}
                switcher={switcher}
              />
            ) : (
              <MedicationPanel
                data={medicationData}
                onBack={() => setSelected(null)}
                switcher={switcher}
              />
            )}
          </motion.div>

        </div>
      </div>
    </PageTransition>
  );
}
