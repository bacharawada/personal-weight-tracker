import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { WeightChart } from "../components/charts/WeightChart";
import { DerivativeChart } from "../components/charts/DerivativeChart";
import { EnergyChart } from "../components/charts/EnergyChart";
import { ResidualsChart } from "../components/charts/ResidualsChart";
import { AxisControls } from "../components/charts/AxisControls";
import { ChartControls } from "../components/charts/ChartControls";
import { ChartExplainer } from "../components/charts/ChartExplainer";
import { ModelStatsStrip } from "../components/charts/ModelStatsStrip";
import { DoseImpactTable } from "../components/charts/DoseImpactTable";
import { WeightChartExplainer } from "../components/charts/explainers/WeightChartExplainer";
import { DerivativeChartExplainer } from "../components/charts/explainers/DerivativeChartExplainer";
import { EnergyChartExplainer } from "../components/charts/explainers/EnergyChartExplainer";
import { ResidualsChartExplainer } from "../components/charts/explainers/ResidualsChartExplainer";
import { resolveEffectiveAxes } from "../lib/charts/effectiveAxes";
import { defaultChartHeight } from "../lib/charts/chartHeight";
import { unitLabel } from "../lib/units";
import { AUTO_AXES, type ChartAxes, type WeightChartData } from "../lib/types";

export function AnalysisPage() {
  const { t } = useTranslation("analysis");
  const { chartParams, setChartParams, refreshKey, setSelectedPoint, unit } = useWeightTracker();
  const [axes, setAxes] = useState<ChartAxes>(AUTO_AXES);
  const [chartHeight, setChartHeight] = useState<number>(defaultChartHeight);
  const [weightData, setWeightData] = useState<WeightChartData | null>(null);
  const effectiveAxes = useMemo(
    () => resolveEffectiveAxes(weightData, axes),
    [weightData, axes]
  );
  // Flatten every model's projection so the axis presets can keep the
  // extrapolation horizon in view. "All history" (the default AUTO_AXES) already
  // shows it via full auto-fit, so no initial preset needs to be applied.
  const projection = useMemo(
    () => weightData?.models.flatMap((model) => model.projection) ?? [],
    [weightData]
  );

  // Titles name both axes and their units, so they follow the display unit.
  const unitSuffix = unitLabel(unit);

  const handlePointClick = useCallback(
    (point: { date: string; weight: number }) => setSelectedPoint(point),
    [setSelectedPoint]
  );

  return (
    <PageTransition>
    <div className="p-4 md:p-8 pb-nav space-y-4 md:space-y-8">
      <PageTitle title={t("page.title")} subtitle={t("page.subtitle")} />

      <ChartControls params={chartParams} onChange={setChartParams} />

      <AxisControls
        axes={axes}
        onChange={setAxes}
        points={weightData?.raw ?? []}
        projection={projection}
        effective={effectiveAxes}
        height={chartHeight}
        onHeightChange={setChartHeight}
      />

      <ModelStatsStrip models={weightData?.models ?? []} unit={unit} />

      {/* The height lives on a wrapper, not the card: it is a runtime pixel value
          from the axis controls, which Tailwind cannot express as a class. */}
      <div style={{ height: chartHeight }}>
        <WeightChart
          params={chartParams}
          refreshKey={refreshKey}
          onPointClick={handlePointClick}
          axes={axes}
          className="h-full"
          title={t("chartTitles.weight", { unit: unitSuffix })}
          onDataLoaded={setWeightData}
        />
      </div>
      <ChartExplainer title={t("explainerTitles.weight")}>
        <WeightChartExplainer data={weightData} params={chartParams} unit={unit} />
      </ChartExplainer>

      <DoseImpactTable refreshKey={refreshKey} unit={unit} />

      <DerivativeChart
        params={chartParams}
        refreshKey={refreshKey}
        title={t("chartTitles.derivative", { unit: unitSuffix })}
      />
      <ChartExplainer title={t("explainerTitles.derivative")}>
        <DerivativeChartExplainer unit={unit} />
      </ChartExplainer>

      <EnergyChart
        params={chartParams}
        refreshKey={refreshKey}
        title={t("chartTitles.energy")}
      />
      <ChartExplainer title={t("explainerTitles.energy")}>
        <EnergyChartExplainer />
      </ChartExplainer>

      <ResidualsChart
        params={chartParams}
        refreshKey={refreshKey}
        title={t("chartTitles.residuals", { unit: unitSuffix })}
      />
      <ChartExplainer title={t("explainerTitles.residuals")}>
        <ResidualsChartExplainer />
      </ChartExplainer>
    </div>
    </PageTransition>
  );
}
