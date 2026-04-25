/**
 * DataPageFAB — mobile floating action button for the Data page.
 *
 * Visible only on screens smaller than `md`. Opens a small popover menu
 * with the same actions as the desktop ActionCards (Add, Import CSV).
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileUp, Plus, X } from "lucide-react";
import { cn } from "../../lib/cn";

interface DataPageFABProps {
  onAdd: () => void;
  onImport: () => void;
}

export function DataPageFAB({ onAdd, onImport }: DataPageFABProps) {
  const [open, setOpen] = useState(false);

  function handleAction(fn: () => void) {
    fn();
    setOpen(false);
  }

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-menu"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-end gap-2"
          >
            {/* Import CSV action */}
            <button
              onClick={() => handleAction(onImport)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-full pl-4 pr-5 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform"
            >
              <FileUp size={16} style={{ color: "var(--color-accent)" }} />
              Import CSV
            </button>

            {/* Add entry action */}
            <button
              onClick={() => handleAction(onAdd)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-full pl-4 pr-5 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform"
            >
              <Plus size={16} style={{ color: "var(--color-accent)" }} />
              Add entry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
        )}
        style={{
          backgroundColor: "var(--color-accent)",
          // @ts-ignore
          "--tw-ring-color": "var(--color-accent)",
        }}
        aria-label={open ? "Close actions" : "Open actions"}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
