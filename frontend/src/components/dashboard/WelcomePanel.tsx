/**
 * WelcomePanel — the dashboard for an account with no measurements.
 *
 * Showing the full layout with every tile locked would be a wall of "not yet".
 * One panel instead: what the page will become, and the single action that
 * starts it. The list is what actually unlocks, in the order it unlocks — a
 * promise the thresholds in lib/dashboard/unlocks.ts keep.
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarCheck, LineChart, Sparkles, Target } from "lucide-react";
import { Card } from "../ui/card";
import { MIN_ENERGY_DAYS, MIN_TREND_POINTS } from "../../lib/dashboard/unlocks";

export function WelcomePanel() {
  const { t } = useTranslation("dashboard");

  const steps = [
    { icon: <CalendarCheck size={16} />, text: t("welcome.steps.first") },
    { icon: <LineChart size={16} />, text: t("welcome.steps.trend", { count: MIN_TREND_POINTS }) },
    { icon: <Target size={16} />, text: t("welcome.steps.goal") },
    { icon: <Sparkles size={16} />, text: t("welcome.steps.energy", { count: MIN_ENERGY_DAYS }) },
  ];

  return (
    <Card className="p-6 md:p-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("welcome.title")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-prose leading-relaxed">
        {t("welcome.body")}
      </p>

      <ul className="mt-5 space-y-2.5">
        {steps.map((step) => (
          <li
            key={step.text}
            className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }}>
              {step.icon}
            </span>
            {step.text}
          </li>
        ))}
      </ul>

      <Link
        to="/data"
        className="inline-flex items-center justify-center rounded-md px-4 py-2 mt-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {t("welcome.cta")}
      </Link>
    </Card>
  );
}
