/**
 * Page heading that uses the active palette's accent color.
 * Color is driven by the --color-accent CSS variable set on <html>
 * by WeightTrackerContext, so no context access is needed here.
 */

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div>
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--color-accent)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
