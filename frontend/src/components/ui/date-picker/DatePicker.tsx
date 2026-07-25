import { useState } from "react"
import { useTranslation } from "react-i18next"
import { enUS, fr } from "date-fns/locale"
import type { Locale } from "date-fns"
import { CalendarDays, X } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { useDisplayPreferences } from "@/context/DisplayPreferencesContext"
import {
  isEmptySegments,
  isoToLocalDate,
  isoToSegments,
  localDateToIso,
  segmentsToIso,
} from "@/lib/dates"
import type { DateSegmentValues } from "@/lib/types"
import { Calendar } from "../calendar"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../popover"
import { DateSegmentedInput } from "./DateSegmentedInput"

const LOCALES: Record<string, Locale> = { en: enUS, fr }

export interface DatePickerProps {
  /** Selected date as ISO `YYYY-MM-DD`, or `null`/`""` when unset. */
  value: string | null
  /** Called with the new ISO date, or `null` when cleared. */
  onChange: (value: string | null) => void
  id?: string
  /** Inclusive lower bound (ISO) — earlier days are disabled and rejected. */
  min?: string
  /** Inclusive upper bound (ISO) — later days are disabled and rejected. */
  max?: string
  disabled?: boolean
  /** Show a clear (×) affordance when a date is selected. */
  clearable?: boolean
  /** Classes for the field — pass height/text to match nearby inputs. */
  className?: string
}

/**
 * DatePicker — a typeable date field with a calendar popover.
 *
 * The field is three digit segments laid out in the user's preferred order and
 * separator; the popover calendar is localised to the UI language. The two
 * stay in sync: picking a day rewrites the segments, and typing a complete,
 * in-range date moves the calendar's selection. The stored value is ISO
 * `YYYY-MM-DD` throughout, so callers are unchanged from the native input this
 * replaces.
 *
 * A typed date is committed as soon as it is complete and valid. Anything
 * incomplete or out of bounds is left alone while the field has focus and
 * reverts to the last committed value on blur, so a half-typed date can never
 * reach the caller.
 */
export function DatePicker({
  value,
  onChange,
  id,
  min,
  max,
  disabled = false,
  clearable = false,
  className,
}: DatePickerProps) {
  const { i18n, t } = useTranslation("common")
  const { dateOrder, dateSeparator } = useDisplayPreferences()
  const [open, setOpen] = useState(false)

  const iso = value != null && value !== "" ? value : null
  const [segments, setSegments] = useState<DateSegmentValues>(() => isoToSegments(iso))
  const [syncedIso, setSyncedIso] = useState(iso)

  // Adjust state during render rather than in an effect: a calendar pick or a
  // form reset must be reflected in the segments before they are painted.
  if (iso !== syncedIso) {
    setSyncedIso(iso)
    setSegments(isoToSegments(iso))
  }

  const selected = iso != null ? isoToLocalDate(iso) : undefined
  const locale = LOCALES[i18n.language.slice(0, 2)] ?? enUS

  const disabledMatchers: Matcher[] = []
  const before = min ? isoToLocalDate(min) : undefined
  const after = max ? isoToLocalDate(max) : undefined
  if (before) disabledMatchers.push({ before })
  if (after) disabledMatchers.push({ after })

  /** ISO dates are fixed-width, so a string compare is a chronological one. */
  function isWithinBounds(candidate: string): boolean {
    if (min && candidate < min) return false
    if (max && candidate > max) return false
    return true
  }

  const typedIso = segmentsToIso(segments)
  const isCommittable = typedIso != null && isWithinBounds(typedIso)
  // Only flag a date the user has finished typing — a half-filled field is not
  // an error yet.
  const isComplete =
    segments.year.length === 4 && segments.month !== "" && segments.day !== ""
  const isInvalid = isComplete && !isCommittable

  function handleSegmentsChange(next: DateSegmentValues) {
    setSegments(next)
    const nextIso = segmentsToIso(next)
    if (nextIso == null || !isWithinBounds(nextIso)) return
    // Record what we emit so the value coming back does not count as an
    // external change: re-deriving the buffers from it would zero-pad the
    // segment being typed, and a padded segment is treated as complete —
    // typing `1` then `0` for October would end up as `0`.
    setSyncedIso(nextIso)
    onChange(nextIso)
  }

  function handleFieldBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    if (isCommittable) {
      // Leaving the field is when a half-typed `5/7/2026` becomes `05/07/2026`.
      setSegments(isoToSegments(typedIso))
      return
    }
    if (isEmptySegments(segments)) {
      if (iso != null) onChange(null)
      return
    }
    setSegments(isoToSegments(iso))
  }

  function handleSelect(day: Date | undefined) {
    if (day == null) return
    onChange(localDateToIso(day))
    setOpen(false)
  }

  function handleClear() {
    setSegments(isoToSegments(null))
    onChange(null)
  }

  const showClear = clearable && !isEmptySegments(segments) && !disabled

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onBlur={handleFieldBlur}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm",
            isInvalid && "border-red-500 focus-within:ring-red-500",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <DateSegmentedInput
            id={id}
            segments={segments}
            onSegmentsChange={handleSegmentsChange}
            order={dateOrder}
            separator={dateSeparator}
            disabled={disabled}
            invalid={isInvalid}
          />
          <div className="ml-auto flex items-center gap-1">
            {showClear && (
              <button
                type="button"
                aria-label={t("datePicker.clear")}
                onClick={handleClear}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={t("datePicker.openCalendar")}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          disabled={disabledMatchers}
          locale={locale}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
