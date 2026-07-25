import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { getEnergyChart } from "../../lib/api";
import { getChartTheme, getPalette } from "../../lib/palettes";
import { useChartData } from "../../lib/charts/useChartData";
import {
  dateTicks,
  linearScale,
  resolveDateDomain,
  resolveValueDomain,
  timeScale,
  toMs,
  valueTicks,
} from "../../lib/charts/scales";
import { AUTO_AXES, type ChartAxes, type ChartParams, type EnergyChartData } from "../../lib/types";
import { ChartCard } from "./primitives/ChartCard";
import { ChartFrame, type Margin } from "./primitives/ChartFrame";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { HoverLayer, type HoverPoint } from "./primitives/HoverLayer";
import { Legend, type LegendItem } from "./primitives/Legend";

interface EnergyChartProps {
  params: ChartParams;
  refreshKey: number;
  axes?: ChartAxes;
}

const MARGIN: Margin = { top: 12, right: 20, bottom: 30, left: 56 };

export function EnergyChart({ params, refreshKey, axes = AUTO_AXES }: EnergyChartProps) {
  const { t } = useTranslation("charts");
  const fetcher = useCallback(() => getEnergyChart(params), [params]);
  const { data, loading, error } = useChartData<EnergyChartData>(fetcher, [refreshKey]);

  const palette = getPalette(params.palette);
  const theme = getChartTheme(params.dark);
  const isEmpty = !data || data.bars.length === 0;

  const legendItems: LegendItem[] = isEmpty
    ? []
    : [
        { label: t("energy.legend.deficit"), color: palette.derivative },
        { label: t("energy.legend.surplus"), color: palette.derivativePos },
      ];

  return (
    <ChartCard
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage={t("energy.empty")}
      className="h-[260px] md:h-[380px]"
    >
      <div className="flex h-full flex-col p-3">
        <div className="mb-1">
          <Legend items={legendItems} />
        </div>
        <div className="min-h-0 flex-1">
          {data && !isEmpty && (
            <ChartFrame margin={MARGIN}>
              {({ innerWidth, innerHeight }) => (
                <EnergyChartBody
                  data={data}
                  axes={axes}
                  palette={palette}
                  theme={theme}
                  innerWidth={innerWidth}
                  innerHeight={innerHeight}
                />
              )}
            </ChartFrame>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

interface BodyProps {
  data: EnergyChartData;
  axes: ChartAxes;
  palette: ReturnType<typeof getPalette>;
  theme: ReturnType<typeof getChartTheme>;
  innerWidth: number;
  innerHeight: number;
}

function EnergyChartBody({ data, axes, palette, theme, innerWidth, innerHeight }: BodyProps) {
  const { t } = useTranslation("charts");
  const { formatDate } = useDisplayPreferences();
  const allMs = data.bars.map((b) => toMs(b.date));
  const allValues = [...data.bars.map((b) => b.kcal), 0];

  const xDomain = resolveDateDomain(allMs, axes.x);
  const yDomain = resolveValueDomain(allValues, axes.y);
  const xScale = timeScale(xDomain, [0, innerWidth]);
  const yScale = linearScale(yDomain, [innerHeight, 0]);
  const x = (ms: number) => xScale(new Date(ms));
  const y = (value: number) => yScale(value);

  const xTicks = dateTicks(xDomain, axes.x.stepDays);
  const yTicks = valueTicks(yDomain, axes.y.step);
  const zeroY = y(0);

  const barWidth = Math.max(2, Math.min(22, (innerWidth / Math.max(data.bars.length, 1)) * 0.6));

  const hoverPoints: HoverPoint<{ date: string; kcal: number }>[] = data.bars.map((b) => ({
    x: x(toMs(b.date)),
    payload: b,
  }));

  return (
    <>
      <AxisLeft ticks={yTicks} scale={y} innerWidth={innerWidth} theme={theme} precision={0} />
      <AxisBottom ticks={xTicks} scale={x} innerWidth={innerWidth} innerHeight={innerHeight} theme={theme} />

      {/* Bars: green for a deficit (kcal < 0), red for a surplus (kcal > 0) */}
      {data.bars.map((bar, i) => {
        const cx = x(toMs(bar.date));
        const barY = y(bar.kcal);
        return (
          <rect
            key={i}
            x={cx - barWidth / 2}
            y={Math.min(zeroY, barY)}
            width={barWidth}
            height={Math.abs(barY - zeroY)}
            fill={bar.kcal < 0 ? palette.derivative : palette.derivativePos}
            opacity={0.55}
          />
        );
      })}

      {/* Zero reference (energy maintenance) */}
      <line x1={0} x2={innerWidth} y1={zeroY} y2={zeroY} stroke={theme.reference} strokeWidth={1} strokeDasharray="4 4" />

      <HoverLayer
        points={hoverPoints}
        innerWidth={innerWidth}
        innerHeight={innerHeight}
        theme={theme}
        header={(p) => formatDate(p.date)}
        lines={(p) => [
          {
            label: t("energy.tooltip.balance"),
            value: t("energy.tooltip.balanceValue", {
              value: `${p.kcal >= 0 ? "+" : ""}${Math.round(p.kcal)}`,
            }),
            color: p.kcal < 0 ? palette.derivative : palette.derivativePos,
          },
        ]}
      />
    </>
  );
}
