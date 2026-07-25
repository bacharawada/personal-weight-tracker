/**
 * DataSectionPanel — shared skeleton for every Data-page section panel.
 *
 * Owns the layout contract the measurements and medication panels both
 * follow: header (mobile back button, icon badge, title/subtitle, header
 * actions), a toolbar whose primary button opens the panel's add dialog,
 * and the scrolling table beneath it.
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DataTable, type Column } from "../../components/ui/DataTable";

interface DataSectionPanelProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Label of the toolbar button that opens the add dialog. */
  addLabel: string;
  onAdd: () => void;
  /** Extra controls rendered next to the add button (import, export…). */
  toolbarActions?: ReactNode;
  /** Destructive / global controls rendered in the header, right-aligned. */
  headerActions?: ReactNode;
  /** Mobile only — returns to the section picker. */
  onBack: () => void;
  columns: Column[];
  loading?: boolean;
  empty?: ReactNode;
  children: ReactNode;
}

export function DataSectionPanel({
  icon,
  title,
  subtitle,
  addLabel,
  onAdd,
  toolbarActions,
  headerActions,
  onBack,
  columns,
  loading,
  empty,
  children,
}: DataSectionPanelProps) {
  const { t } = useTranslation("common");

  return (
    <section className="flex flex-1 min-h-0 min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={t("actions.back")}
          className="md:hidden -ml-2 h-11 w-11 shrink-0"
        >
          <ArrowLeft size={20} />
        </Button>

        <span
          className="hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        {headerActions && (
          <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* Card: toolbar + table */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-700">
          <Button variant="primary" size="sm" onClick={onAdd}>
            <Plus size={15} />
            {addLabel}
          </Button>
          {toolbarActions}
        </div>

        <DataTable columns={columns} loading={loading} empty={empty}>
          {children}
        </DataTable>
      </div>
    </section>
  );
}
