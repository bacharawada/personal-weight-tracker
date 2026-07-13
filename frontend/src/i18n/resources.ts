/**
 * Static resource bundle for i18next.
 *
 * Every namespace is imported (bundled at build time — no HTTP backend) and
 * assembled per language. Adding a namespace means importing its `en`/`fr`
 * files and adding one line to each language map here.
 */

import enCommon from "./locales/en/common";
import enNav from "./locales/en/nav";
import enAuth from "./locales/en/auth";
import enAbout from "./locales/en/about";
import enDashboard from "./locales/en/dashboard";
import enAnalysis from "./locales/en/analysis";
import enCharts from "./locales/en/charts";
import enData from "./locales/en/data";
import enMedication from "./locales/en/medication";
import enSettings from "./locales/en/settings";
import enProfile from "./locales/en/profile";
import enOnboarding from "./locales/en/onboarding";

import frCommon from "./locales/fr/common";
import frNav from "./locales/fr/nav";
import frAuth from "./locales/fr/auth";
import frAbout from "./locales/fr/about";
import frDashboard from "./locales/fr/dashboard";
import frAnalysis from "./locales/fr/analysis";
import frCharts from "./locales/fr/charts";
import frData from "./locales/fr/data";
import frMedication from "./locales/fr/medication";
import frSettings from "./locales/fr/settings";
import frProfile from "./locales/fr/profile";
import frOnboarding from "./locales/fr/onboarding";

export const defaultNS = "common";

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    about: enAbout,
    dashboard: enDashboard,
    analysis: enAnalysis,
    charts: enCharts,
    data: enData,
    medication: enMedication,
    settings: enSettings,
    profile: enProfile,
    onboarding: enOnboarding,
  },
  fr: {
    common: frCommon,
    nav: frNav,
    auth: frAuth,
    about: frAbout,
    dashboard: frDashboard,
    analysis: frAnalysis,
    charts: frCharts,
    data: frData,
    medication: frMedication,
    settings: frSettings,
    profile: frProfile,
    onboarding: frOnboarding,
  },
};

/** Shape of one language's namespaces — drives `t()` key type-checking. */
export type AppResources = (typeof resources)["en"];
