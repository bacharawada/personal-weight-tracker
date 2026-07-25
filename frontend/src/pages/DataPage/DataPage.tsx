/**
 * DataPage — two-panel host for the data sections.
 *
 * Desktop (md+): a persistent left rail with the two section cards, the
 * selected section's panel filling the rest of the width.
 * Mobile: master-detail drill-down — the cards fill the screen until one is
 * picked, then the panel replaces them (its own back button returns here).
 *
 * The split is pure CSS: `selected` stays null on first mobile render so the
 * rail shows, while the desktop layout always renders a panel by falling
 * back to the measurements section.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Scale, Syringe } from "lucide-react";
import { PageTransition } from "../../components/layout/PageTransition";
import { PageTitle } from "../../components/layout/PageTitle";
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

export function DataPage() {
  const { t } = useTranslation("data");
  const measurementsData = useDataPage();
  const medicationData = useMedicationDoses();

  const [selected, setSelected] = useState<Section | null>(null);
  const active: Section = selected ?? SECTIONS.measurements;

  const measurementCount = measurementsData.measurements.length;
  const doseCount = medicationData.doses.length;

  return (
    <PageTransition>
      <div className="flex h-full flex-col overflow-hidden px-4 pt-4 pb-nav md:px-8 md:pt-8">
        <div className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col gap-5">

          {/* Page heading — hidden on mobile once a panel is open */}
          <div className={cn("shrink-0", selected && "hidden md:block")}>
            <PageTitle
              title={t("page.title")}
              subtitle={t("page.subtitle", { count: measurementCount })}
            />
          </div>

          <div className="flex flex-1 min-h-0 gap-6">

            {/* Section picker */}
            <div
              className={cn(
                "w-full shrink-0 flex-col gap-3 md:flex md:w-72",
                selected ? "hidden" : "flex",
              )}
            >
              <DataSectionCard
                icon={<Scale size={22} />}
                title={t("picker.measurementsTitle")}
                subtitle={t("page.subtitle", { count: measurementCount })}
                isSelected={selected === SECTIONS.measurements}
                onClick={() => setSelected(SECTIONS.measurements)}
              />
              <DataSectionCard
                icon={<Syringe size={22} />}
                title={t("section.title", { ns: "medication" })}
                subtitle={t("section.subtitle", {
                  ns: "medication",
                  count: doseCount,
                })}
                isSelected={selected === SECTIONS.medication}
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
                />
              ) : (
                <MedicationPanel
                  data={medicationData}
                  onBack={() => setSelected(null)}
                />
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
