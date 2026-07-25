import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "../../ui/Spinner";

interface ChartCardProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage?: string;
  className?: string;
  /** Optional top-right controls (e.g. an export button). */
  toolbar?: ReactNode;
  /**
   * Drop the card surface and keep only the spinner / empty / error states, for
   * a chart embedded in a panel that already owns a surface of its own.
   */
  bare?: boolean;
  children: ReactNode;
}

/** Card chrome shared by every chart: surface, spinner, empty and error states. */
export function ChartCard({
  loading,
  error,
  isEmpty,
  emptyMessage,
  className = "",
  toolbar,
  bare = false,
  children,
}: ChartCardProps) {
  const { t } = useTranslation("charts");
  const resolvedEmptyMessage = emptyMessage ?? t("card.empty");
  const surface = bare ? "" : "bg-white dark:bg-gray-800 rounded-lg shadow";
  return (
    <div
      className={`relative overflow-hidden flex flex-col ${surface} ${className}`}
    >
      {toolbar && <div className="absolute top-2 right-2 z-20">{toolbar}</div>}

      <AnimatePresence>
        {loading && (
          <motion.div
            key="chart-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg"
          >
            <Spinner size={32} />
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && error && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
          {resolvedEmptyMessage}
        </div>
      )}

      {!error && !isEmpty && (
        <motion.div
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 min-h-0"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
