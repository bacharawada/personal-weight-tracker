import { useTranslation } from "react-i18next";
import { Globe, Moon, Scale, Sun } from "lucide-react";

interface ShareHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

/**
 * Header of the public share page: title, "view only" badge, and the theme and
 * language switches the visitor gets in place of account settings.
 */
export function ShareHeader({ isDark, onToggleTheme }: ShareHeaderProps) {
  const { t, i18n } = useTranslation("share");

  const currentLanguage = i18n.language.startsWith("fr") ? "fr" : "en";
  const nextLanguage = currentLanguage === "fr" ? "en" : "fr";

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 shrink-0">
          <Scale className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              {t("title")}
            </h1>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {t("badge")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={t("toggleTheme")}
          title={t("toggleTheme")}
          className="p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          onClick={() => void i18n.changeLanguage(nextLanguage)}
          aria-label={t("toggleLanguage")}
          title={t("toggleLanguage")}
          className="flex items-center gap-1.5 p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
        >
          <Globe size={18} />
          <span className="text-xs font-medium uppercase">{nextLanguage}</span>
        </button>
      </div>
    </header>
  );
}
