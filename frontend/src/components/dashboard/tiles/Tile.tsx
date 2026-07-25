/**
 * Tile — the surface every dashboard module sits on.
 *
 * Owns the chrome the modules would otherwise each repeat: the card surface,
 * and a header row with a muted label, an optional leading icon and an optional
 * trailing slot (a badge, a link). Modules render only their own body.
 */

import { type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { Card } from "../../ui/card";

interface TileProps {
  label: string;
  /** Leading glyph, rendered muted at the label's size. */
  icon?: ReactNode;
  /** Trailing header slot — a badge, a counter, a link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Tile({ label, icon, action, className, children }: TileProps) {
  return (
    <Card className={cn("flex flex-col p-4", className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </Card>
  );
}
