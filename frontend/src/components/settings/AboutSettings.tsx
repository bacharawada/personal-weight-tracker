/**
 * AboutSettings — the "About" section of the Settings page.
 *
 * App name, version badge, developer links and a shortcut to the full About
 * page. Static content only — nothing here reads or writes preferences.
 *
 * Renders the full section (heading + card) so the page just drops it in.
 */

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { GithubIcon } from "../ui/github-icon";
import { Button } from "../ui/button";

const APP_VERSION = "1.1.0";

export function AboutSettings() {
  const { t } = useTranslation("settings");

  return (
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
  );
}
