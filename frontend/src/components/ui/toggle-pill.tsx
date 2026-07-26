import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const togglePillVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-40 md:py-1.5",
  {
    variants: {
      isPressed: {
        true: "border-gray-300 bg-white text-gray-900 shadow-sm dark:border-gray-500 dark:bg-gray-700 dark:text-white",
        false:
          "border-dashed border-gray-300 bg-transparent text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-300",
      },
    },
    defaultVariants: {
      isPressed: false,
    },
  }
)

interface TogglePillProps {
  label: string
  isPressed: boolean
  onPressedChange: (isPressed: boolean) => void
  /**
   * Colour of the series this pill controls, shown as a leading swatch drawn like
   * the chart legend so the mapping to the plotted trace is obvious.
   */
  swatchColor?: string
  disabled?: boolean
  /** Native tooltip, e.g. to explain why the pill is disabled. */
  title?: string
}

/**
 * On/off pill for a single chart series or overlay.
 *
 * Off is deliberately drawn as a dashed outline with a faded swatch rather than a
 * second filled state, so "what is currently plotted" reads at a glance without
 * five competing accent colours.
 */
export function TogglePill({
  label,
  isPressed,
  onPressedChange,
  swatchColor,
  disabled = false,
  title,
}: TogglePillProps) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      disabled={disabled}
      title={title}
      onClick={() => onPressedChange(!isPressed)}
      className={cn(togglePillVariants({ isPressed }))}
    >
      {swatchColor && (
        <span
          aria-hidden="true"
          className="inline-block h-[3px] w-4 shrink-0 rounded-full"
          style={{ backgroundColor: swatchColor, opacity: isPressed ? 1 : 0.35 }}
        />
      )}
      {label}
    </button>
  )
}
