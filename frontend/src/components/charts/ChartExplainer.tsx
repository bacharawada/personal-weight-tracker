import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Info } from "lucide-react";

interface ChartExplainerProps {
  title: string;
  children: ReactNode;
}

/**
 * Body copy of the panel.
 *
 * The page has no max-width, so past `xl` a single column runs a line far beyond a
 * comfortable measure (the card is then ~1200px wide for 14px text). From there the
 * prose flows into two columns instead: the measure comes back to ~570px and the
 * panel is about half as tall.
 *
 * Section spacing is bottom margins rather than `space-y`, whose top margins would
 * push the second column's opening line below the first column's.
 */
const PROSE_CLASS = [
  "px-4 pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300",
  "[&>*]:mb-4 [&>*:last-child]:mb-0",
  // A heading is never left stranded at the foot of a column without its text.
  "xl:columns-2 xl:gap-8 xl:[&_h4]:break-after-avoid",
  // Hairline rule centred in the gutter. `column-rule` has no Tailwind utility,
  // hence the arbitrary property; the colour pair matches the app's light borders.
  "xl:[column-rule:1px_solid_theme(colors.gray.200)]",
  "xl:dark:[column-rule-color:theme(colors.gray.700)]",
].join(" ");

/** Collapsible "how this works" panel shown under a chart. Closed by default. */
export function ChartExplainer({ title, children }: ChartExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
      >
        <Info size={15} className="shrink-0" />
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={PROSE_CLASS}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
