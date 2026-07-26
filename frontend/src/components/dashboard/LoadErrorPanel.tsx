/**
 * LoadErrorPanel — shown when the measurements request failed and there is
 * nothing cached to render.
 *
 * It stands in for WelcomePanel in exactly one case: no rows to show *and* the
 * request that would have provided them rejected. Claiming "your dashboard
 * starts with one weigh-in" to someone with two years of history is the failure
 * this panel exists to prevent.
 */

import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";

interface LoadErrorPanelProps {
  onRetry: () => void;
}

export function LoadErrorPanel({ onRetry }: LoadErrorPanelProps) {
  const { t } = useTranslation("dashboard");

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("loadError.title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-prose leading-relaxed">
            {t("loadError.body")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 mt-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        <RefreshCw size={15} />
        {t("loadError.retry")}
      </button>
    </Card>
  );
}
