/**
 * DataSectionCard — one of the two large section selectors on the Data page.
 *
 * Mobile only: a drill-down entry that opens the section's panel in place.
 * It carries no selected state — the card and its panel are never on screen
 * together, and desktop switches sections through the segmented control.
 */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface DataSectionCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

export function DataSectionCard({
  icon,
  title,
  subtitle,
  onClick,
}: DataSectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full min-h-[88px] cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-150 hover:border-[var(--color-accent)] active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          color: "var(--color-accent)",
        }}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-gray-800 transition-colors group-hover:text-[var(--color-accent)] dark:text-gray-100">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </span>
      </span>

      <ChevronRight
        size={18}
        className="shrink-0 text-gray-300 transition-colors group-hover:text-[var(--color-accent)] dark:text-gray-600"
      />
    </button>
  );
}
