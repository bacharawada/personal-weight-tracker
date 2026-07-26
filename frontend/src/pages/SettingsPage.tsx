/**
 * SettingsPage — layout host for the settings sections.
 *
 * Full-bleed like the dashboard and analysis pages: no centring, no width
 * cap, the same `p-4 md:p-8` gutters. From `lg` the sections split into two
 * columns whose membership is fixed rather than auto-flowed — the four cards
 * have very different heights, and a fixed split keeps the columns roughly
 * even instead of leaving one trailing far below the other.
 */

import { useTranslation } from "react-i18next";
import { PageTransition } from "../components/layout/PageTransition";
import { PageTitle } from "../components/layout/PageTitle";
import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { PaletteSettings } from "../components/settings/PaletteSettings";
import { DisplayFormatSettings } from "../components/settings/DisplayFormatSettings";
import { AboutSettings } from "../components/settings/AboutSettings";

export function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <PageTransition>
      <div className="p-4 md:p-8 pb-nav space-y-6 md:space-y-8">
        <PageTitle title={t("title")} subtitle={t("subtitle")} />

        <div className="grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-2">
          <div className="space-y-6 md:space-y-8">
            <AppearanceSettings />
            <DisplayFormatSettings />
          </div>
          <div className="space-y-6 md:space-y-8">
            <PaletteSettings />
            <AboutSettings />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
