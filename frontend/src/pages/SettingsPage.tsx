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
      <div className="p-4 md:p-6 pb-nav space-y-6 md:space-y-8 max-w-2xl">
        <PageTitle title={t("title")} subtitle={t("subtitle")} />
        <AppearanceSettings />
        <PaletteSettings />
        <DisplayFormatSettings />
        <AboutSettings />
      </div>
    </PageTransition>
  );
}
