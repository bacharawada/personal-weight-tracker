import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

// The inset ring keeps the track edge visible on any surface — the menu (white /
// gray-900) and the settings card (gray-800) would otherwise swallow it.
const TRACK_CLASS =
  "relative inline-flex shrink-0 items-center rounded-full p-0.5 bg-gray-100 ring-1 ring-inset ring-gray-200 dark:bg-gray-800/80 dark:ring-white/10"

const knobVariants = cva(
  "absolute top-0.5 bottom-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-gray-600",
  {
    variants: {
      size: {
        sm: "w-6",
        md: "w-7",
      },
      isSecond: {
        true: "translate-x-full",
        false: "translate-x-0",
      },
    },
    defaultVariants: { size: "md", isSecond: false },
  }
)

const optionVariants = cva(
  "relative z-10 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800",
  {
    variants: {
      size: {
        sm: "h-6 w-6",
        md: "h-7 w-7",
      },
      isActive: {
        true: "",
        false: "text-gray-500 opacity-60 grayscale hover:opacity-90 dark:text-gray-400",
      },
    },
    defaultVariants: { size: "md", isActive: false },
  }
)

export interface IconSwitchOption<T extends string> {
  value: T
  /** Rendered inside the knob slot — a lucide icon (inherits `currentColor`) or a flag. */
  icon: React.ReactNode
  /** Accessible name for this side of the switch. */
  label: string
}

interface IconSwitchProps<T extends string> {
  /** Exactly two sides — this control is a switch, not a segmented list. */
  options: readonly [IconSwitchOption<T>, IconSwitchOption<T>]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group — the switch has no visible label of its own. */
  ariaLabel: string
  size?: "sm" | "md"
}

/**
 * Two-state icon switch: a pill track with a knob sliding under the active icon.
 *
 * Exposed as a radiogroup so arrow keys move between the two sides. The inactive
 * icon is dimmed and desaturated, which keeps colourful marks (flags) readable
 * as "not selected" without needing a second palette.
 */
export function IconSwitch<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: IconSwitchProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowUp":
        break
      default:
        return
    }
    event.preventDefault()
    const next = activeIndex === 0 ? 1 : 0
    onChange(options[next].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={TRACK_CLASS}
    >
      <span
        aria-hidden="true"
        className={cn(knobVariants({ size, isSecond: activeIndex === 1 }))}
      />
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(optionVariants({ size, isActive }))}
            style={isActive ? { color: "var(--color-accent)" } : undefined}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}
