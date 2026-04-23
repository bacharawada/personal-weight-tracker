import { useCallback, useEffect, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { AddMeasurement } from "../components/forms/AddMeasurement";
import { DeletePoint } from "../components/forms/DeletePoint";
import { getMeasurements, exportCsvUrl } from "../lib/api";
import type { Measurement } from "../lib/types";
import { Download, Trash2 } from "lucide-react";

export function DataPage() {
  const { refreshKey, bump, selectedPoint, setSelectedPoint, hasData } = useWeightTracker();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMeasurements()
      .then(setMeasurements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleRowClick = useCallback(
    (m: Measurement) => {
      setSelectedPoint(
        selectedPoint?.date === m.date ? null : { date: m.date, weight: m.weight }
      );
    },
    [selectedPoint, setSelectedPoint]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {measurements.length} measurement{measurements.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <a
          href={hasData ? exportCsvUrl() : undefined}
          download="measurements.csv"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-50 dark:bg-gray-800 text-gray-400 pointer-events-none"
          }`}
        >
          <Download size={16} /> Export CSV
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table — 2/3 width */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : measurements.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No measurements yet. Add your first one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Weight (kg)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {measurements.map((m) => {
                  const isSelected = selectedPoint?.date === m.date;
                  return (
                    <tr
                      key={m.date}
                      onClick={() => handleRowClick(m)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{m.date}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-900 dark:text-gray-100">
                        {m.weight.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <Trash2 size={12} /> Selected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Forms — 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <AddMeasurement onSuccess={bump} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <DeletePoint
              selectedPoint={selectedPoint}
              onSuccess={() => { bump(); setSelectedPoint(null); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
