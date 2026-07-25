import type { ReactNode } from "react";

interface ControlGroupProps {
  label: string;
  /** Optional trailing slot on the label row (a value badge, a hint…). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Soft panel wrapping one logical group of chart controls.
 *
 * Grouping is carried by a tinted surface instead of dividers so it survives every
 * breakpoint unchanged, whether the groups sit side by side or stack on a phone.
 */
export function ControlGroup({ label, action, className = "", children }: ControlGroupProps) {
  return (
    <div className={`rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40 ${className}`}>
      <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}
