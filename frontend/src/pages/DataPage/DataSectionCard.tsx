/**
 * DataSectionCard — one of the two large section selectors on the Data page.
 *
 * Differs from the generic ActionCard by carrying a selected state: on
 * desktop the active card stays highlighted while its panel is shown, on
 * mobile it acts as a plain drill-down entry.
 */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

interface DataSectionCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  isSelected: boolean;
  onClick: () => void;
}

export function DataSectionCard({
  icon,
  title,
  subtitle,
  isSelected,
  onClick,
}: DataSectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "group flex w-full min-h-[88px] items-center gap-4 rounded-xl border p-4 text-left",
        "cursor-pointer transition-all duration-150 active:scale-[0.98]",
        isSelected
          ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] shadow-sm"
          : "border-gray-200 bg-white shadow-sm hover:border-[var(--color-accent)] dark:border-gray-700 dark:bg-gray-800",
      )}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
        style={
          isSelected
            ? { backgroundColor: "var(--color-accent)", color: "#fff" }
            : {
                backgroundColor:
                  "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent)",
              }
        }
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-base font-semibold transition-colors",
            isSelected
              ? "text-[var(--color-accent)]"
              : "text-gray-800 group-hover:text-[var(--color-accent)] dark:text-gray-100",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </span>
      </span>

      <ChevronRight
        size={18}
        className={cn(
          "shrink-0 transition-colors",
          isSelected
            ? "text-[var(--color-accent)]"
            : "text-gray-300 group-hover:text-[var(--color-accent)] dark:text-gray-600",
        )}
      />
    </button>
  );
}
