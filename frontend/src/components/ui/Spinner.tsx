/**
 * Centered spinner. Color defaults to the active palette accent.
 */

import { useContext } from "react";
import { WeightTrackerContext } from "../../context/WeightTrackerContext";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Spinner({ size = 24, color, className = "" }: SpinnerProps) {
  const ctx = useContext(WeightTrackerContext);
  const resolvedColor = color ?? ctx?.accent ?? "#2563eb";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      style={{ color: resolvedColor }}
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="12"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}
