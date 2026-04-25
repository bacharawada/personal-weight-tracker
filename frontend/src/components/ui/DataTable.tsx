/**
 * DataTable — generic table shell.
 *
 * Handles the scroll container, loading state, empty state and the
 * <table> / <thead> structure. Row content is provided via children,
 * keeping row-specific logic out of this component.
 */

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Spinner } from "./Spinner";

interface Column {
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  loading?: boolean;
  /** Rendered when not loading and children is empty/falsy. */
  empty?: ReactNode;
  children: ReactNode;
}

export function DataTable({
  columns,
  loading = false,
  empty,
  children,
}: DataTableProps) {
  const alignClass = (align: Column["align"] = "left") =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  // Determine emptiness by checking if children is null/undefined/false or an empty array
  const isEmpty =
    children === null ||
    children === undefined ||
    children === false ||
    (Array.isArray(children) && children.length === 0);

  if (isEmpty && empty) {
    return (
      <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm">
        {empty}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <motion.table
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full text-sm"
      >
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((col) => (
              <th
                key={col.label}
                className={[
                  "px-4 py-3 font-medium text-gray-500 dark:text-gray-400",
                  alignClass(col.align),
                  col.className ?? "",
                ].join(" ")}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {children}
        </tbody>
      </motion.table>
    </div>
  );
}
