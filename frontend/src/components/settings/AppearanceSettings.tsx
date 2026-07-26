/**
 * AppearanceSettings — the "Appearance" section of the Settings page.
 *
 * Holds the two preferences that change the shell itself rather than the
 * data: the colour scheme and the interface language. Both apply immediately.
 *
 * Renders the full section (heading + card) so the page just drops it in.
 */

import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { FlagFrIcon } from "../ui/flag-fr-icon";
import { FlagGbIcon } from "../ui/flag-gb-icon";
import { IconSwitch } from "../ui/icon-switch";
import type { Language } from "../../i18n/config";
import { LANGUAGE_LABELS } from "../../i18n/config";
import { Theme } from "../../lib/types";

export function AppearanceSettings() {
  const { t, i18n } = useTranslation("settings");
  const { isDark, toggleTheme } = useWeightTracker();
  const currentLanguage: Language = i18n.language.startsWith("fr") ? "fr" : "en";

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("appearance.heading")}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("appearance.theme")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("appearance.currently", { mode: isDark ? t("appearance.dark") : t("appearance.light") })}
            </p>
          </div>
          <IconSwitch
            options={[
              { value: Theme.Light, icon: <Sun size={15} />, label: t("appearance.light") },
              { value: Theme.Dark, icon: <Moon size={15} />, label: t("appearance.dark") },
            ]}
            value={isDark ? Theme.Dark : Theme.Light}
            onChange={(next) => {
              if (next !== (isDark ? Theme.Dark : Theme.Light)) toggleTheme();
            }}
            ariaLabel={t("appearance.theme")}
          />
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("appearance.language")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("appearance.currently", { mode: LANGUAGE_LABELS[currentLanguage] })}
            </p>
          </div>
          <IconSwitch
            options={[
              { value: "en", icon: <FlagGbIcon className="h-[18px] w-[18px]" />, label: LANGUAGE_LABELS.en },
              { value: "fr", icon: <FlagFrIcon className="h-[18px] w-[18px]" />, label: LANGUAGE_LABELS.fr },
            ]}
            value={currentLanguage}
            onChange={(next) => void i18n.changeLanguage(next)}
            ariaLabel={t("appearance.language")}
          />
        </div>
      </div>
    </section>
  );
}
