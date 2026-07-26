/**
 * LockedTile — a module that cannot be filled yet, holding its place.
 *
 * Keeps the label and the footprint of the real tile so the layout does not
 * reflow as data arrives, and states the one thing that would unlock it. A
 * dashed, unfilled surface reads as "not yet" rather than "broken", and the
 * requirement turns an empty panel into something to complete.
 */

import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { cn } from "../../../lib/utils";

interface LockedTileProps {
  label: string;
  /** What would unlock the module, in one sentence. */
  hint: string;
  icon?: ReactNode;
  /** Route the hint links to, when the user can act on it directly. */
  to?: string;
  className?: string;
}

export function LockedTile({ label, hint, icon, to, className }: LockedTileProps) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-gray-400 dark:text-gray-500">
          {icon ?? <Lock size={16} />}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 leading-snug">{hint}</p>
    </>
  );

  const classes = cn(
    "flex flex-col rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4",
    to && "hover:border-gray-400 dark:hover:border-gray-500 transition-colors",
    className,
  );

  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
