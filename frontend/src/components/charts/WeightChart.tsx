import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { format as formatDate } from "date-fns";
import { getWeightChart } from "../../lib/api";
import { getChartTheme, getPalette, hexToRgba } from "../../lib/palettes";
import { bandPath, linePath, type PixelPoint } from "../../lib/charts/geometry";
import { exportSvgToPng } from "../../lib/charts/exportPng";
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
import { AUTO_AXES, ModelId, type ChartAxes, type ChartParams, type WeightChartData } from "../../lib/types";
import { ChartCard } from "./primitives/ChartCard";
import { ChartFrame, type Margin } from "./primitives/ChartFrame";
import { AxisBottom, AxisLeft } from "./primitives/Axes";
import { HoverLayer, type HoverPoint } from "./primitives/HoverLayer";
import { Legend, type LegendItem } from "./primitives/Legend";

interface WeightChartProps {
  params: ChartParams;
  refreshKey: number;
  onPointClick: (point: { date: string; weight: number }) => void;
  axes?: ChartAxes;
  className?: string;
  /** Called with each fetched payload so the page can reuse the model diagnostics. */
  onDataLoaded?: (data: WeightChartData) => void;
  /**
   * Optional data source. Defaults to the authenticated `/api/charts/weight`
   * endpoint; the public share page passes a fetcher hitting the token-scoped
   * public endpoint instead. `params` still drives re-fetch dependencies.
   */
  fetcher?: () => Promise<WeightChartData>;
}

const MARGIN: Margin = { top: 12, right: 20, bottom: 30, left: 46 };

export function WeightChart({
  params,
  refreshKey,
  onPointClick,
  axes = AUTO_AXES,
  className,
  onDataLoaded,
  fetcher,
}: WeightChartProps) {
  const { t } = useTranslation("charts");
  const svgRef = useRef<SVGSVGElement>(null);
  const defaultFetcher = useCallback(() => getWeightChart(params), [params]);
  const activeFetcher = fetcher ?? defaultFetcher;
  const { data, loading, error } = useChartData<WeightChartData>(activeFetcher, [
    refreshKey,
    params.smoothing,
    params.horizon,
    params.showExp,
    params.showLinear,
    params.showBand,
  ]);

  useEffect(() => {
    if (data) onDataLoaded?.(data);
  }, [data, onDataLoaded]);

  const palette = getPalette(params.palette);
  const theme = getChartTheme(params.dark);
  const isEmpty = !data || data.raw.length === 0;

  const handleExport = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    void exportSvgToPng(svg, {
      width: Math.round(rect.width) || 1000,
      height: Math.round(rect.height) || 480,
      filename: "weight_chart.png",
      background: params.dark ? "#1F2937" : "#FFFFFF",
    });
  }, [params.dark]);

  const legendItems: LegendItem[] = [];
  if (data && !isEmpty) {
    legendItems.push({ label: t("weight.legend.measurements"), color: palette.raw });
    legendItems.push({
      label: t("weight.legend.rollingMean", { count: data.smoothing_window }),
      color: palette.smoothed,
    });
    for (const model of data.models) {
      legendItems.push({
        label: model.label,
        color: model.id === ModelId.Exp ? palette.fit : palette.fitLinear,
      });
    }
    if (data.goal_weight != null) {
      legendItems.push({
        label: t("weight.legend.goal", { value: data.goal_weight.toFixed(1) }),
        color: palette.accent,
        dashed: true,
      });
    }
  }

  return (
    <ChartCard
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      className={className ?? "h-[300px] md:flex-1 md:h-auto md:min-h-0"}
      toolbar={
        !isEmpty ? (
          <button
            onClick={handleExport}
            title={t("weight.exportPng")}
            className="rounded-md bg-white/80 dark:bg-gray-700/80 p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white shadow-sm"
          >
            <Download size={15} />
          </button>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col p-3">
        <div className="mb-1 pr-8">
          <Legend items={legendItems} />
        </div>
        <div className="min-h-0 flex-1">
          {data && !isEmpty && (
            <ChartFrame margin={MARGIN} svgRef={svgRef}>
              {({ innerWidth, innerHeight }) => (
                <WeightChartBody
                  data={data}
                  axes={axes}
                  palette={palette}
                  theme={theme}
                  innerWidth={innerWidth}
                  innerHeight={innerHeight}
                  onPointClick={onPointClick}
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
  data: WeightChartData;
  axes: ChartAxes;
  palette: ReturnType<typeof getPalette>;
  theme: ReturnType<typeof getChartTheme>;
  innerWidth: number;
  innerHeight: number;
  onPointClick: (point: { date: string; weight: number }) => void;
}

function WeightChartBody({
  data,
  axes,
  palette,
  theme,
  innerWidth,
  innerHeight,
  onPointClick,
}: BodyProps) {
  const { t } = useTranslation("charts");
  // -- Collect domains across every series ----------------------------------
  const allMs: number[] = [
    ...data.raw.map((p) => toMs(p.date)),
    ...data.models.flatMap((m) => m.projection.map((p) => toMs(p.date))),
  ];
  const allValues: number[] = [
    ...data.raw.map((p) => p.value),
    ...data.smoothed.map((p) => p.value),
    ...data.models.flatMap((m) => [
      ...m.fit.map((p) => p.value),
      ...m.projection.map((p) => p.value),
      ...m.band.flatMap((b) => [b.lower, b.upper]),
    ]),
  ];
  if (data.goal_weight != null) allValues.push(data.goal_weight);
  for (const m of data.models) if (m.asymptote != null) allValues.push(m.asymptote);

  const xDomain = resolveDateDomain(allMs, axes.x);
  const yDomain = resolveValueDomain(allValues, axes.y);
  const xScale = timeScale(xDomain, [0, innerWidth]);
  const yScale = linearScale(yDomain, [innerHeight, 0]);
  const x = (ms: number) => xScale(new Date(ms));
  const y = (value: number) => yScale(value);

  const xTicks = dateTicks(xDomain, axes.x.stepDays);
  const yTicks = valueTicks(yDomain, axes.y.step);
  const yPrecision = yTicks.some((t) => !Number.isInteger(t)) ? 1 : 0;

  const project = (pts: { date: string; value: number }[]): PixelPoint[] =>
    pts.map((p) => ({ x: x(toMs(p.date)), y: y(p.value) }));

  const rawPx = project(data.raw);
  const smoothedPx = project(data.smoothed);

  const hoverPoints: HoverPoint<{ date: string; value: number }>[] = data.raw.map((p) => ({
    x: x(toMs(p.date)),
    payload: p,
  }));

  return (
    <>
      {/* Deviation zones (behind everything) */}
      {data.zones.map((zone, i) => {
        const x0 = x(toMs(zone.start));
        const x1 = x(toMs(zone.end));
        return (
          <rect
            key={i}
            x={x0}
            y={0}
            width={Math.max(0, x1 - x0)}
            height={innerHeight}
            fill={zone.kind === "plateau" ? palette.residualAbove : palette.residualBelow}
            opacity={0.1}
          />
        );
      })}

      {/* Gridlines + axes */}
      <AxisLeft ticks={yTicks} scale={y} innerWidth={innerWidth} theme={theme} precision={yPrecision} />
      <AxisBottom ticks={xTicks} scale={x} innerWidth={innerWidth} innerHeight={innerHeight} theme={theme} />

      {/* Model uncertainty bands */}
      {data.models.map((model) =>
        model.band.length > 0 ? (
          <path
            key={`band-${model.id}`}
            d={bandPath(model.band.map((b) => ({ x: x(toMs(b.date)), y0: y(b.lower), y1: y(b.upper) })))}
            fill={hexToRgba(palette.band, 0.18)}
            stroke="none"
          />
        ) : null,
      )}

      {/* Model fit + projection lines */}
      {data.models.map((model) => {
        const color = model.id === ModelId.Exp ? palette.fit : palette.fitLinear;
        return (
          <g key={`model-${model.id}`}>
            <path d={linePath(project(model.fit))} fill="none" stroke={color} strokeWidth={1.8} />
            {model.projection.length > 0 && (
              <path
                d={linePath(project(model.projection))}
                fill="none"
                stroke={color}
                strokeWidth={1.8}
                strokeDasharray="6 4"
                opacity={0.6}
              />
            )}
            {model.asymptote != null && (
              <line
                x1={0}
                x2={innerWidth}
                y1={y(model.asymptote)}
                y2={y(model.asymptote)}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            )}
          </g>
        );
      })}

      {/* Raw measurements: line + markers */}
      <path d={linePath(rawPx)} fill="none" stroke={palette.raw} strokeWidth={1.4} opacity={0.85} />
      {rawPx.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={palette.raw} stroke={theme.tooltipBg} strokeWidth={0.5} />
      ))}

      {/* Rolling mean */}
      <path d={linePath(smoothedPx)} fill="none" stroke={palette.smoothed} strokeWidth={2.4} />

      {/* Goal line */}
      {data.goal_weight != null && (
        <line
          x1={0}
          x2={innerWidth}
          y1={y(data.goal_weight)}
          y2={y(data.goal_weight)}
          stroke={palette.accent}
          strokeWidth={2}
          strokeDasharray="2 3"
          opacity={0.8}
        />
      )}

      {/* Hover + click-to-select */}
      <HoverLayer
        points={hoverPoints}
        innerWidth={innerWidth}
        innerHeight={innerHeight}
        theme={theme}
        header={(p) => formatDate(new Date(toMs(p.date)), "MMM d, yyyy")}
        lines={(p) => [
          {
            label: t("weight.tooltip.weight"),
            value: t("weight.tooltip.weightValue", { value: p.value.toFixed(1) }),
            color: palette.raw,
          },
        ]}
        dots={(p) => [{ y: y(p.value), color: palette.raw }]}
        onSelect={(p) => onPointClick({ date: p.date.slice(0, 10), weight: p.value })}
      />
    </>
  );
}
