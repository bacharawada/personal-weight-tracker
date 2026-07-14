export interface LegendItem {
  label: string;
  color: string;
  dashed?: boolean;
}

/** Compact horizontal legend rendered as HTML chips above a chart. */
export function Legend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-[3px] w-4 rounded-full"
            style={{
              backgroundColor: item.dashed ? "transparent" : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
            }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
