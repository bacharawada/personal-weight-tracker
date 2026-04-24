/**
 * Typed wrapper around lucide-react icons.
 *
 * Usage:
 *   <Icon name="BarChart2" size={20} className="text-muted-foreground" />
 *
 * The `name` prop is typed as `LucideIconName`, giving full autocomplete
 * over the ~1000 available lucide icons.
 */

import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";

// Build the icon name union from the lucide-react exports,
// filtering to only the actual icon component names (PascalCase, not types).
type LucideExports = typeof LucideIcons;
export type LucideIconName = {
  [K in keyof LucideExports]: LucideExports[K] extends React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>
    ? K
    : never;
}[keyof LucideExports];

import React from "react";

interface IconProps extends LucideProps {
  name: LucideIconName;
}

export function Icon({ name, ...props }: IconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LucideIcon = (LucideIcons as any)[name] as React.ComponentType<LucideProps>;
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }
  return <LucideIcon {...props} />;
}
