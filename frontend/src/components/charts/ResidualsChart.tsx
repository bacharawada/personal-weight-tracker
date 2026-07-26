import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { getResidualsChart } from "../../lib/api";
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
import { AUTO_AXES, ModelId, type ChartAxes, type ChartParams, type ResidualsChartData } from "../../lib/types";
import { ChartCard } from "./primitives/ChartCard";
import { ChartFrame, type Margin } from "./primitives/ChartFrame";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { HoverLayer, type HoverPoint } from "./primitives/HoverLayer";
import { Legend, type LegendItem } from "./primitives/Legend";

interface ResidualsChartProps {
  params: ChartParams;
  refreshKey: number;
  axes?: ChartAxes;
  /** Heading shown inside the card — see ChartCard's `title`. */
  title?: string;
}

const MARGIN: Margin = { top: 12, right: 20, bottom: 30, left: 46 };

export function ResidualsChart({
  params,
  refreshKey,
  axes = AUTO_AXES,
  title,
}: ResidualsChartProps) {
  const { t } = useTranslation("charts");
  const fetcher = useCallback(() => getResidualsChart(params), [params]);
  const { data, loading, error } = useChartData<ResidualsChartData>(fetcher, [
    refreshKey,
    params.smoothing,
    params.horizon,
    params.showExp,
    params.showLinear,
  ]);

  const palette = getPalette(params.palette);
  const theme = getChartTheme(params.dark);
  const isEmpty = !data || data.series.length === 0;

  const seriesColor = (id: string) => (id === ModelId.Exp ? palette.fit : palette.fitLinear);
  const legendItems: LegendItem[] = isEmpty
    ? []
    : data.series.map((s) => ({ label: s.label, color: seriesColor(s.id) }));

  return (
    <ChartCard
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage={t("residuals.empty")}
      title={title}
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
                <ResidualsChartBody
                  data={data}
                  axes={axes}
                  seriesColor={seriesColor}
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
  data: ResidualsChartData;
  axes: ChartAxes;
  seriesColor: (id: string) => string;
  theme: ReturnType<typeof getChartTheme>;
  innerWidth: number;
  innerHeight: number;
}

function ResidualsChartBody({ data, axes, seriesColor, theme, innerWidth, innerHeight }: BodyProps) {
  const { t } = useTranslation("charts");
  const { formatDate } = useDisplayPreferences();
  const allPoints = data.series.flatMap((s) => s.points);
  const allMs = allPoints.map((p) => toMs(p.date));
  const allValues = [...allPoints.map((p) => p.value), data.sigma, -data.sigma];

  const xDomain = resolveDateDomain(allMs, axes.x);
  const yDomain = resolveValueDomain(allValues, axes.y);
  const xScale = timeScale(xDomain, [0, innerWidth]);
  const yScale = linearScale(yDomain, [innerHeight, 0]);
  const x = (ms: number) => xScale(new Date(ms));
  const y = (value: number) => yScale(value);

  const xTicks = dateTicks(xDomain, axes.x.stepDays);
  const yTicks = valueTicks(yDomain, axes.y.step);

  // Hover off the first (reference) series; show every series' residual there.
  const refSeries = data.series[0];
  const hoverPoints: HoverPoint<number>[] = refSeries.points.map((p, i) => ({
    x: x(toMs(p.date)),
    payload: i,
  }));

  return (
    <>
      <AxisLeft ticks={yTicks} scale={y} innerWidth={innerWidth} theme={theme} precision={1} />
      <AxisBottom ticks={xTicks} scale={x} innerWidth={innerWidth} innerHeight={innerHeight} theme={theme} />

      {/* ±1σ band */}
      {data.sigma > 0 && (
        <rect
          x={0}
          y={y(data.sigma)}
          width={innerWidth}
          height={Math.abs(y(-data.sigma) - y(data.sigma))}
          fill={theme.mutedText}
          opacity={0.08}
        />
      )}

      {/* Zero reference */}
      <line x1={0} x2={innerWidth} y1={y(0)} y2={y(0)} stroke={theme.reference} strokeWidth={1} strokeDasharray="4 4" />

      {/* Residual series */}
      {data.series.map((s) => {
        const color = seriesColor(s.id);
        const px = s.points.map((p) => ({ x: x(toMs(p.date)), y: y(p.value) }));
        return (
          <g key={s.id}>
            <path d={linePath(px)} fill="none" stroke={color} strokeWidth={1.4} />
            {px.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
            ))}
          </g>
        );
      })}

      <HoverLayer
        points={hoverPoints}
        innerWidth={innerWidth}
        innerHeight={innerHeight}
        theme={theme}
        header={(i) => formatDate(refSeries.points[i].date)}
        lines={(i) =>
          data.series.map((s) => ({
            label: s.label.replace(" residuals", ""),
            value: t("residuals.tooltip.value", {
              value: `${s.points[i].value >= 0 ? "+" : ""}${s.points[i].value.toFixed(2)}`,
            }),
            color: seriesColor(s.id),
          }))
        }
        dots={(i) => data.series.map((s) => ({ y: y(s.points[i].value), color: seriesColor(s.id) }))}
      />
    </>
  );
}
