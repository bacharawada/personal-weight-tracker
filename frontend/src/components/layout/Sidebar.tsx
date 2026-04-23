import { useEffect, useState } from "react";
import { getPalettes, exportPngUrl, exportCsvUrl } from "../../lib/api";
import type { ChartParams } from "../../lib/types";
import { AddMeasurement } from "../forms/AddMeasurement";
import { DeletePoint } from "../forms/DeletePoint";
import { Download } from "lucide-react";

interface SidebarProps {
  chartParams: ChartParams;
  onParamsChange: (params: ChartParams) => void;
  selectedPoint: { date: string; weight: number } | null;
  onDataChange: () => void;
  onClearSelection: () => void;
  hasData: boolean;
}

export function Sidebar({
  chartParams,
  onParamsChange,
  selectedPoint,
  onDataChange,
  onClearSelection,
  hasData,
}: SidebarProps) {
  const [palettes, setPalettes] = useState<string[]>([]);

  useEffect(() => {
    getPalettes().then((p) => setPalettes(p.names)).catch(console.error);
  }, []);

  const horizonOptions = [
    { label: "4 weeks", value: 28 },
    { label: "8 weeks", value: 56 },
    { label: "3 months", value: 90 },
    { label: "6 months", value: 180 },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Controls</h2>

      {/* Add measurement */}
      <AddMeasurement onSuccess={onDataChange} />

      {/* Delete measurement */}
      <DeletePoint
        selectedPoint={selectedPoint}
        onSuccess={() => { onDataChange(); onClearSelection(); }}
      />

      {/* Smoothing window */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Smoothing Window: {chartParams.smoothing}
        </label>
        <input
          type="range"
          min={3}
          max={10}
          step={1}
          value={chartParams.smoothing}
          onChange={(e) =>
            onParamsChange({ ...chartParams, smoothing: Number(e.target.value) })
          }
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>3</span><span>10</span>
        </div>
      </div>

      {/* Extrapolation horizon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Extrapolation Horizon
        </label>
        <div className="flex flex-wrap gap-2">
          {horizonOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onParamsChange({ ...chartParams, horizon: opt.value })}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                chartParams.horizon === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Palette picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Color Palette
        </label>
        <select
          value={chartParams.palette}
          onChange={(e) => onParamsChange({ ...chartParams, palette: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        >
          {palettes.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Export buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Export
        </label>
        <div className="flex gap-2">
          <a
            href={hasData ? exportPngUrl(chartParams) : undefined}
            download="weight_chart.png"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
              hasData
                ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                : "bg-gray-50 dark:bg-gray-800 text-gray-400 pointer-events-none"
            }`}
          >
            <Download size={14} /> PNG
          </a>
          <a
            href={hasData ? exportCsvUrl() : undefined}
            download="measurements.csv"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
              hasData
                ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                : "bg-gray-50 dark:bg-gray-800 text-gray-400 pointer-events-none"
            }`}
          >
            <Download size={14} /> CSV
          </a>
        </div>
      </div>
    </div>
  );
}
