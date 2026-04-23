/**
 * Page heading that uses the active palette's accent color.
 */

import { useWeightTracker } from "../../context/WeightTrackerContext";
import { getPaletteAccent } from "../../lib/palette";

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  const { chartParams } = useWeightTracker();
  const accent = getPaletteAccent(chartParams.palette);

  return (
    <div>
      <h1
        className="text-2xl font-bold"
        style={{ color: accent }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
