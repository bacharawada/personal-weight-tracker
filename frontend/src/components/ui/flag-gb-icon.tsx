/**
 * Union Jack, cropped to a circle by the wrapper's `overflow-hidden`.
 *
 * Drawn on a square canvas rather than the flag's real 1:2 ratio: at 16–20px the
 * crop reads as "English" and stays legible, which a squashed 1:2 flag would not.
 * The saltire is a plain cross of strokes — the counterchanged offset of the real
 * flag disappears at this size.
 */
export function FlagGbIcon({ className }: { className?: string }) {
  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15 ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0 24 24M24 0 0 24" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M0 0 24 24M24 0 0 24" stroke="#C8102E" strokeWidth="2.2" />
        <path d="M12 0V24M0 12H24" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M12 0V24M0 12H24" stroke="#C8102E" strokeWidth="4" />
      </svg>
    </span>
  );
}
