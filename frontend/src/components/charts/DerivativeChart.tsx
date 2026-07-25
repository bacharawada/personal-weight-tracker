import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { getDerivativeChart } from "../../lib/api";
import { getChartTheme, getPalette } from "../../lib/palettes";
import { linePath } from "../../lib/charts/geometry";
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
import { AUTO_AXES, type ChartAxes, type ChartParams, type DerivativeChartData } from "../../lib/types";
import { ChartCard } from "./primitives/ChartCard";
import { ChartFrame, type Margin } from "./primitives/ChartFrame";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { HoverLayer, type HoverPoint } from "./primitives/HoverLayer";
import { Legend, type LegendItem } from "./primitives/Legend";

interface DerivativeChartProps {
  params: ChartParams;
  refreshKey: number;
  axes?: ChartAxes;
}

const MARGIN: Margin = { top: 12, right: 20, bottom: 30, left: 46 };

export function DerivativeChart({ params, refreshKey, axes = AUTO_AXES }: DerivativeChartProps) {
  const { t } = useTranslation("charts");
  const fetcher = useCallback(() => getDerivativeChart(params), [params]);
  const { data, loading, error } = useChartData<DerivativeChartData>(fetcher, [refreshKey]);

  const palette = getPalette(params.palette);
  const theme = getChartTheme(params.dark);
  const isEmpty = !data || data.bars.length === 0;

  const legendItems: LegendItem[] = isEmpty
    ? []
    : [
        { label: t("derivative.legend.loss"), color: palette.derivative },
        { label: t("derivative.legend.gain"), color: palette.derivativePos },
        { label: t("derivative.legend.smoothedRate"), color: palette.derivativeSmooth },
      ];

  return (
    <ChartCard
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage={t("derivative.empty")}
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
                <DerivativeChartBody
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
  data: DerivativeChartData;
  axes: ChartAxes;
  palette: ReturnType<typeof getPalette>;
  theme: ReturnType<typeof getChartTheme>;
  innerWidth: number;
  innerHeight: number;
}

function DerivativeChartBody({ data, axes, palette, theme, innerWidth, innerHeight }: BodyProps) {
  const { t } = useTranslation("charts");
  const { formatDate } = useDisplayPreferences();
  const allMs = data.bars.map((b) => toMs(b.date));
  const allValues = [
    ...data.bars.map((b) => b.rate),
    ...data.smoothed.map((p) => p.value),
    0,
  ];

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

  const smoothedPx = data.smoothed.map((p) => ({ x: x(toMs(p.date)), y: y(p.value) }));
  const hoverPoints: HoverPoint<{ date: string; rate: number }>[] = data.bars.map((b) => ({
    x: x(toMs(b.date)),
    payload: b,
  }));

  return (
    <>
      <AxisLeft ticks={yTicks} scale={y} innerWidth={innerWidth} theme={theme} precision={1} />
      <AxisBottom ticks={xTicks} scale={x} innerWidth={innerWidth} innerHeight={innerHeight} theme={theme} />

      {/* Bars: green for loss (rate < 0), red for gain (rate > 0) */}
      {data.bars.map((bar, i) => {
        const cx = x(toMs(bar.date));
        const barY = y(bar.rate);
        return (
          <rect
            key={i}
            x={cx - barWidth / 2}
            y={Math.min(zeroY, barY)}
            width={barWidth}
            height={Math.abs(barY - zeroY)}
            fill={bar.rate < 0 ? palette.derivative : palette.derivativePos}
            opacity={0.55}
          />
        );
      })}

      {/* Zero reference */}
      <line x1={0} x2={innerWidth} y1={zeroY} y2={zeroY} stroke={theme.reference} strokeWidth={1} strokeDasharray="4 4" />

      {/* Smoothed rate */}
      <path d={linePath(smoothedPx)} fill="none" stroke={palette.derivativeSmooth} strokeWidth={1.8} />

      <HoverLayer
        points={hoverPoints}
        innerWidth={innerWidth}
        innerHeight={innerHeight}
        theme={theme}
        header={(p) => formatDate(p.date)}
        lines={(p) => [
          {
            label: t("derivative.tooltip.rate"),
            value: t("derivative.tooltip.rateValue", {
              value: `${p.rate >= 0 ? "+" : ""}${p.rate.toFixed(2)}`,
            }),
            color: p.rate < 0 ? palette.derivative : palette.derivativePos,
          },
        ]}
      />
    </>
  );
}
