/**
 * DataSectionPanel — shared skeleton for every Data-page section.
 *
 * One self-contained card: header (icon badge, title/subtitle, discreet
 * controls), the icon cards that open the add and import dialogs, then the
 * scrolling table.
 *
 * Height is breakpoint-dependent. From xl the page locks to the viewport and
 * the card fills its grid cell, so the table scrolls inside it. Below that the
 * two sections stack and the page scrolls, so the card caps itself instead —
 * otherwise a long measurement list would bury the medication section far
 * below the fold.
 */

import type { ReactNode } from "react";
import { DataTable, type Column } from "../../components/ui/DataTable";

interface DataSectionPanelProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** The section's add / import icon cards. */
  actions: ReactNode;
  /** Discreet controls rendered in the header, right-aligned. */
  headerActions?: ReactNode;
  columns: Column[];
  loading?: boolean;
  empty?: ReactNode;
  children: ReactNode;
}

export function DataSectionPanel({
  icon,
  title,
  subtitle,
  actions,
  headerActions,
  columns,
  loading,
  empty,
  children,
}: DataSectionPanelProps) {
  return (
    <section className="flex max-h-[70vh] min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:max-h-none">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            color: "var(--color-accent)",
          }}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        {headerActions && (
          <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* Add / import entry points */}
      <div className="shrink-0 border-b border-gray-100 p-4 dark:border-gray-700">
        {actions}
      </div>

      <DataTable columns={columns} loading={loading} empty={empty}>
        {children}
      </DataTable>
    </section>
  );
}
