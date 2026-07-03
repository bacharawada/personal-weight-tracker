/**
 * Static resource bundle for i18next.
 *
 * Every namespace is imported (bundled at build time — no HTTP backend) and
 * assembled per language. Adding a namespace means importing its `en`/`fr`
 * files and adding one line to each language map here.
 */

import enCommon from "./locales/en/common";
import enNav from "./locales/en/nav";

import frCommon from "./locales/fr/common";
import frNav from "./locales/fr/nav";

export const defaultNS = "common";

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
  },
  fr: {
    common: frCommon,
    nav: frNav,
  },
};

/** Shape of one language's namespaces — drives `t()` key type-checking. */
export type AppResources = (typeof resources)["en"];
