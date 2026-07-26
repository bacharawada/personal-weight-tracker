/** French tricolour, cropped to a circle by the wrapper's `overflow-hidden`. */
export function FlagFrIcon({ className }: { className?: string }) {
  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15 ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <rect width="8" height="24" fill="#002395" />
        <rect x="8" width="8" height="24" fill="#FFFFFF" />
        <rect x="16" width="8" height="24" fill="#ED2939" />
      </svg>
    </span>
  );
}
