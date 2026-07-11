import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { PALETTE_NAMES, PALETTE_PREVIEWS, getPaletteAccent } from "../lib/palettes";
import { Globe, Moon, Sun } from "lucide-react";
import { GithubIcon } from "../components/ui/github-icon";
import { Button } from "../components/ui/button";

const APP_VERSION = "1.0.0";

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { isDark, toggleTheme, chartParams, setChartParams } = useWeightTracker();
  const palettes = PALETTE_NAMES;

  return (
    <PageTransition>
    <div className="p-4 md:p-6 pb-nav space-y-6 md:space-y-8 max-w-2xl">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      {/* Theme */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("appearance.heading")}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("appearance.theme")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("appearance.currently", { mode: isDark ? t("appearance.dark") : t("appearance.light") })}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme} className="shrink-0">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? t("appearance.switchToLight") : t("appearance.switchToDark")}
            </Button>
          </div>
        </div>
      </section>

      {/* Colour palette */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("palette.heading")}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <motion.div
            key="palette-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {palettes.map((name) => {
              const swatches = PALETTE_PREVIEWS[name] ?? ["#888", "#aaa", "#ccc"];
              const isActive = chartParams.palette === name;
              return (
                <button
                  key={name}
                  onClick={() => setChartParams({ ...chartParams, palette: name })}
                  className={`flex items-center gap-3 p-3 min-h-[52px] rounded-lg border-2 text-left transition-colors ${
                    isActive
                      ? ""
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  style={isActive ? {
                    borderColor: getPaletteAccent(name),
                    backgroundColor: `${getPaletteAccent(name)}18`,
                  } : undefined}
                >
                  <div className="flex gap-1">
                    {swatches.map((color) => (
                      <div
                        key={color}
                        className="w-5 h-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t(`palette.names.${name}`, { defaultValue: name })}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-xs font-medium" style={{ color: getPaletteAccent(chartParams.palette) }}>
                      {t("palette.active")}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t("about.heading")}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-4">
          {/* App name + version */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("appName", { ns: "common" })}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("about.tagline")}
              </p>
            </div>
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              {t("about.version", { version: APP_VERSION })}
            </span>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700" />

          {/* Developer links */}
          <div className="flex flex-col gap-2">
            <a
              href="https://github.com/bacharawada"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <GithubIcon className="shrink-0 w-[15px] h-[15px] text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
              <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600">
                github.com/bacharawada
              </span>
            </a>
            <a
              href="https://portfolio.bawada.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <Globe size={15} className="shrink-0 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
              <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600">
                portfolio.bawada.fr
              </span>
            </a>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700" />

          <Button variant="ghost" size="sm" asChild className="w-full justify-center text-gray-500 dark:text-gray-400">
            <Link to="/about">{t("about.viewFullAbout")}</Link>
          </Button>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
