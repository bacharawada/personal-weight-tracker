import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import {
  SEGMENT_LIMITS,
  dateSegmentOrder,
  effectiveSeparator,
  stepSegment,
} from "@/lib/dates"
import { DateSegment } from "@/lib/types"
import type { DateOrder, DateSegmentValues, DateSeparator } from "@/lib/types"

/** Keys that mean "I'm done with this segment" — every separator we render, plus `.`. */
const ADVANCE_KEYS = new Set(["/", "-", ".", ",", " "])

export interface DateSegmentedInputProps {
  segments: DateSegmentValues
  onSegmentsChange: (segments: DateSegmentValues) => void
  order: DateOrder
  separator: DateSeparator
  /** Focuses the first segment — wire the field's `<label htmlFor>` to this. */
  id?: string
  disabled?: boolean
  /** Marks every segment as invalid — the segments are one value, not three. */
  invalid?: boolean
}

/**
 * DateSegmentedInput — three digit fields (day, month, year) behaving as one.
 *
 * A controlled, presentation-only editor: it owns keyboard behaviour and focus
 * movement, never validation. The parent decides what a complete set of
 * buffers means and when to commit it.
 *
 * Digits are handled on `keydown` with the default prevented, which keeps the
 * caret out of the way and lets a full segment overwrite instead of append.
 * `onChange` stays as the fallback path for soft keyboards, which report
 * `Unidentified` on `keydown` and only surface the text afterwards.
 */
export function DateSegmentedInput({
  segments,
  onSegmentsChange,
  order,
  separator,
  id,
  disabled = false,
  invalid = false,
}: DateSegmentedInputProps) {
  const { t } = useTranslation("common")
  const inputs = useRef<Partial<Record<DateSegment, HTMLInputElement | null>>>({})

  const fields = dateSegmentOrder(order)
  const sep = effectiveSeparator(order, separator)

  function focusAt(index: number) {
    const segment = fields[index]
    if (segment == null) return
    const element = inputs.current[segment]
    if (element == null) return
    element.focus()
    element.select()
  }

  function setSegment(segment: DateSegment, digits: string) {
    onSegmentsChange({ ...segments, [segment]: digits })
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    segment: DateSegment,
    index: number,
  ) {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    const limits = SEGMENT_LIMITS[segment]
    const current = segments[segment]

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      const delta = event.key === "ArrowUp" ? 1 : -1
      setSegment(segment, stepSegment(segment, current, delta, new Date()))
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusAt(index - 1)
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      focusAt(index + 1)
      return
    }

    if (event.key === "Backspace") {
      event.preventDefault()
      if (current !== "") {
        setSegment(segment, current.slice(0, -1))
        return
      }
      // Empty already: eat into the previous segment, like one long field.
      const previous = fields[index - 1]
      if (previous != null) {
        setSegment(previous, segments[previous].slice(0, -1))
        focusAt(index - 1)
      }
      return
    }

    if (event.key === "Delete") {
      event.preventDefault()
      setSegment(segment, "")
      return
    }

    if (ADVANCE_KEYS.has(event.key)) {
      event.preventDefault()
      focusAt(index + 1)
      return
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      // A full segment restarts rather than silently dropping the keystroke.
      const base = current.length >= limits.length ? "" : current
      const next = base + event.key
      // Move on as soon as no further digit could keep the value in range —
      // typing `4` in a day field can only ever mean the 4th. A segment being
      // left behind is zero-padded, so the field reads as a normal date even
      // mid-entry.
      const isDone = next.length >= limits.length || Number(next) * 10 > limits.max
      setSegment(segment, isDone ? next.padStart(limits.length, "0") : next)
      if (isDone) focusAt(index + 1)
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
    segment: DateSegment,
    index: number,
  ) {
    const limits = SEGMENT_LIMITS[segment]
    const digits = event.target.value.replace(/\D/g, "").slice(-limits.length)
    setSegment(segment, digits)
    if (digits.length >= limits.length) focusAt(index + 1)
  }

  return (
    <div className="flex items-center tabular-nums">
      {fields.map((segment, index) => (
        <div key={segment} className="flex items-center">
          {index > 0 && (
            <span aria-hidden className="px-0.5 text-muted-foreground select-none">
              {sep}
            </span>
          )}
          <input
            ref={(element) => {
              inputs.current[segment] = element
            }}
            id={index === 0 ? id : undefined}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={segments[segment]}
            placeholder={t(`datePicker.placeholder.${segment}`)}
            aria-label={t(`datePicker.label.${segment}`)}
            aria-invalid={invalid}
            onKeyDown={(event) => handleKeyDown(event, segment, index)}
            onChange={(event) => handleChange(event, segment, index)}
            onFocus={(event) => event.target.select()}
            className={cn(
              "bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
              segment === DateSegment.Year ? "w-[4ch]" : "w-[2ch]",
            )}
          />
        </div>
      ))}
    </div>
  )
}
