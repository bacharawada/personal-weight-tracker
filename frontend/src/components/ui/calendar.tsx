import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Calendar — a Tailwind-styled wrapper around react-day-picker.
 *
 * Fully styled through `classNames` (the library's own stylesheet is not
 * imported) so it inherits the app's light/dark theme and the active palette
 * accent (`--color-accent`) for the selected day.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center items-center h-9",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute top-0 inset-x-0 flex items-center justify-between px-1 h-9",
        button_previous:
          "inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none",
        button_next:
          "inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-1.5",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "inline-flex items-center justify-center h-9 w-9 rounded-md font-normal text-foreground hover:bg-muted aria-selected:opacity-100 transition-colors",
        selected:
          "[&>button]:bg-[var(--color-accent)] [&>button]:text-white [&>button]:hover:bg-[var(--color-accent)] [&>button]:hover:opacity-90",
        today: "[&>button]:border [&>button]:border-[var(--color-accent)]",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-30 [&>button]:pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
