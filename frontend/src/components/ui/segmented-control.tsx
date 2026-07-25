import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const segmentVariants = cva(
  "flex-1 whitespace-nowrap rounded-md font-medium transition-colors touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
  {
    variants: {
      size: {
        sm: "px-2 py-1.5 text-xs",
        md: "px-3 py-2 text-sm md:py-1.5",
      },
      isActive: {
        true: "text-white shadow-sm",
        false:
          "text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white",
      },
    },
    defaultVariants: {
      size: "md",
      isActive: false,
    },
  }
)

export interface SegmentedControlOption<T extends string | number> {
  value: T
  label: string
  /** Compact label used below the `sm` breakpoint so many segments still fit a phone. */
  shortLabel?: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string | number> {
  options: readonly SegmentedControlOption<T>[]
  /** `null` when the current state matches no option (e.g. a manual override). */
  value: T | null
  onChange: (value: T) => void
  /** Accessible name for the group — the control has no visible label of its own. */
  ariaLabel: string
  size?: "sm" | "md"
}

/**
 * Single-choice segmented control: one row of mutually exclusive segments sharing
 * a track, the active one filled with the user's palette accent.
 *
 * Exposed as a radiogroup with arrow-key / Home / End navigation. The track scrolls
 * horizontally rather than wrapping, so a long option set stays on one line on
 * narrow screens.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: SegmentedControlProps<T>) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const firstEnabled = options.find((option) => !option.disabled)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = options.filter((option) => !option.disabled)
    if (enabled.length === 0) return

    const current = enabled.findIndex((option) => option.value === value)
    let next: number
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (current + 1) % enabled.length
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = (current - 1 + enabled.length) % enabled.length
        break
      case "Home":
        next = 0
        break
      case "End":
        next = enabled.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    onChange(enabled[next].value)
    // Roving focus: keep the keyboard on the segment that just became active.
    const segments = trackRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not(:disabled)'
    )
    segments?.[next]?.focus()
  }

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="flex w-full items-stretch gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-900/50"
    >
      {options.map((option) => {
        const isActive = option.value === value
        // With no option active, the first enabled one still has to be tabbable
        // so the group stays reachable by keyboard.
        const isTabbable = isActive || (value === null && option === firstEnabled)
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isTabbable ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(segmentVariants({ size, isActive }))}
            style={isActive ? { backgroundColor: "var(--color-accent)" } : undefined}
          >
            {option.shortLabel ? (
              <>
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        )
      })}
    </div>
  )
}
