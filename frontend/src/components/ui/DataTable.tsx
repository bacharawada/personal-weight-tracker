/**
 * DataTable — generic table shell.
 *
 * Handles the scroll container, loading state, empty state and the
 * <table> / <thead> structure. Row content is provided via children,
 * keeping row-specific logic out of this component.
 *
 * With `isSplitOnWide`, a long row list flows into two side-by-side tables
 * from `xl` up: a handful of columns stretched over a wide monitor wastes the
 * width and scrolls anyway, so the spare space buys twice as many visible
 * rows instead. Sequential, not interleaved — the left table holds the first
 * half so top-to-bottom then left-to-right still reads in order.
 */

import { Children, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Spinner } from "./Spinner";

export interface Column {
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  loading?: boolean;
  /** Rendered when not loading and children is empty/falsy. */
  empty?: ReactNode;
  /** Flow the rows into two side-by-side tables on wide viewports. */
  isSplitOnWide?: boolean;
  children: ReactNode;
}

/** Mirrors Tailwind's `xl` breakpoint — where two tables still fit readably. */
const SPLIT_QUERY = "(min-width: 1280px)";

/** Below this, two columns would only make the table look broken. */
const MIN_ROWS_FOR_SPLIT = 8;

export function DataTable({
  columns,
  loading = false,
  empty,
  isSplitOnWide = false,
  children,
}: DataTableProps) {
  const isWideViewport = useMediaQuery(SPLIT_QUERY);

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

  const rows = Children.toArray(children);
  const isSplit =
    isSplitOnWide && isWideViewport && rows.length >= MIN_ROWS_FOR_SPLIT;
  const groups = isSplit
    ? [rows.slice(0, Math.ceil(rows.length / 2)), rows.slice(Math.ceil(rows.length / 2))]
    : [rows];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
      <div
        className={cn(
          "flex items-start",
          // The rule is darker than the row dividers and the halves pad away
          // from it symmetrically. Without both, the two tables read as one
          // 8-column table whose rows happen to line up.
          isSplit && "divide-x divide-gray-200 dark:divide-gray-700",
        )}
      >
        {groups.map((group, index) => (
          <div
            key={index}
            className={cn(
              "min-w-0 flex-1",
              isSplit && (index === 0 ? "pr-6" : "pl-6"),
            )}
          >
            <motion.table
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full min-w-[26rem] text-sm"
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
                {group}
              </tbody>
            </motion.table>
          </div>
        ))}
      </div>
    </div>
  );
}
