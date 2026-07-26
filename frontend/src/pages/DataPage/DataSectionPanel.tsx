/**
 * DataSectionPanel — shared skeleton for every Data-page section panel.
 *
 * Owns the layout contract the measurements and medication panels both
 * follow: header (mobile back button, title/subtitle or the desktop section
 * switcher, header actions), a toolbar whose primary button opens the panel's
 * add dialog, and the scrolling table beneath it.
 *
 * The header swaps identity by breakpoint. On mobile the panel is reached by
 * drilling into a card, so it names itself. On desktop the switcher sits in
 * that slot and names the section instead — repeating the title next to it
 * would only cost a row of table height.
 */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DataTable, type Column } from "../../components/ui/DataTable";

interface DataSectionPanelProps {
  title: string;
  subtitle: string;
  /** Label of the toolbar button that opens the add dialog. */
  addLabel: string;
  onAdd: () => void;
  /** Desktop only — the control that switches between sections. */
  switcher?: ReactNode;
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
  title,
  subtitle,
  addLabel,
  onAdd,
  switcher,
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

        <div className="min-w-0 flex-1 md:hidden">
          <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        {switcher && (
          <div className="hidden min-w-0 flex-1 md:block md:max-w-sm">
            {switcher}
          </div>
        )}

        {headerActions && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {headerActions}
          </div>
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
