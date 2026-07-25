import { useState } from "react"
import { useTranslation } from "react-i18next"
import { enUS, fr } from "date-fns/locale"
import type { Locale } from "date-fns"
import { CalendarDays, X } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { useDisplayPreferences } from "@/context/DisplayPreferencesContext"
import { isoToLocalDate, localDateToIso } from "@/lib/dates"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const LOCALES: Record<string, Locale> = { en: enUS, fr }

export interface DatePickerProps {
  /** Selected date as ISO `YYYY-MM-DD`, or `null`/`""` when unset. */
  value: string | null
  /** Called with the new ISO date, or `null` when cleared. */
  onChange: (value: string | null) => void
  id?: string
  /** Inclusive lower bound (ISO) — earlier days are disabled. */
  min?: string
  /** Inclusive upper bound (ISO) — later days are disabled. */
  max?: string
  disabled?: boolean
  /** Show a clear (×) affordance when a date is selected. */
  clearable?: boolean
  placeholder?: string
  /** Classes for the trigger button — pass height/text to match nearby fields. */
  className?: string
}

/**
 * DatePicker — a calendar-popover date field that replaces `<input type="date">`.
 *
 * The trigger shows the date in the user's chosen order and separator (via the
 * display-preferences formatter); the popover calendar is localised to the UI
 * language. The stored value stays ISO `YYYY-MM-DD` throughout, so callers are
 * unchanged from the native input they replace.
 */
export function DatePicker({
  value,
  onChange,
  id,
  min,
  max,
  disabled = false,
  clearable = false,
  placeholder,
  className,
}: DatePickerProps) {
  const { i18n } = useTranslation()
  const { formatDate } = useDisplayPreferences()
  const [open, setOpen] = useState(false)

  const hasValue = value != null && value !== ""
  const selected = hasValue ? isoToLocalDate(value) : undefined
  const locale = LOCALES[i18n.language.slice(0, 2)] ?? enUS

  const disabledMatchers: Matcher[] = []
  const before = min ? isoToLocalDate(min) : undefined
  const after = max ? isoToLocalDate(max) : undefined
  if (before) disabledMatchers.push({ before })
  if (after) disabledMatchers.push({ after })

  function handleSelect(day: Date | undefined) {
    if (day == null) return
    onChange(localDateToIso(day))
    setOpen(false)
  }

  function handleClear(event: React.MouseEvent) {
    // Don't open the popover when clearing.
    event.stopPropagation()
    onChange(null)
  }

  const showClear = clearable && hasValue && !disabled

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The clear button is a sibling of the trigger, never nested inside it —
          a button within a button is invalid and breaks click handling. */}
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              !hasValue && "text-muted-foreground",
              showClear && "pr-8",
              className
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left truncate">
              {hasValue ? formatDate(value) : (placeholder ?? "")}
            </span>
          </button>
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
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
