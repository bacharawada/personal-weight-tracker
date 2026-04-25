/**
 * ActionCard — clickable card with icon, title, description and a trailing arrow.
 *
 * Used in DataPage (Add entry / Import CSV) and OnboardingWizard (path selection).
 * Replaces the previously duplicated ActionCard and PathCard private components.
 */

import { ArrowRight, ChevronRight } from "lucide-react";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  /**
   * "default"    — elevated card with shadow (DataPage style)
   * "onboarding" — flat bordered card (OnboardingWizard style)
   */
  variant?: "default" | "onboarding";
}

export function ActionCard({
  icon,
  title,
  description,
  onClick,
  variant = "default",
}: ActionCardProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <button
      onClick={onClick}
      className={[
        "group flex items-center gap-4 w-full p-4 min-h-[60px] text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
        isOnboarding
          ? "items-start rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
          : "rounded-lg shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[var(--color-accent)] hover:bg-blue-50/40 dark:hover:bg-[var(--color-accent)]/5",
      ].join(" ")}
    >
      {/* Icon */}
      <div
        className={[
          "shrink-0 flex items-center justify-center transition-colors",
          isOnboarding ? "p-2 rounded-lg" : "w-9 h-9 rounded-xl",
        ].join(" ")}
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          color: "var(--color-accent)",
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            "text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors",
            isOnboarding
              ? "group-hover:text-blue-600 dark:group-hover:text-blue-400"
              : "group-hover:text-[var(--color-accent)]",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {description}
        </p>
      </div>

      {/* Trailing arrow */}
      {isOnboarding ? (
        <ArrowRight className="shrink-0 w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors mt-0.5" />
      ) : (
        <ChevronRight
          size={16}
          className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-[var(--color-accent)] transition-colors"
        />
      )}
    </button>
  );
}
