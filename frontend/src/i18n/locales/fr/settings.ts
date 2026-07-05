/**
 * `settings` namespace (French).
 *
 * Mirrors the English `settings` resource key-for-key. Palette display labels
 * are translated; the underlying palette ids are untouched.
 */

import type { SettingsResource } from "../en/settings";

const settings: SettingsResource = {
  title: "Paramètres",
  subtitle: "Personnalisez l'apparence et exportez vos données",
  appearance: {
    heading: "Apparence",
    theme: "Thème",
    currently: "Actuellement : {{mode}}",
    dark: "Sombre",
    light: "Clair",
    switchToDark: "Passer en sombre",
    switchToLight: "Passer en clair",
  },
  palette: {
    heading: "Palette de couleurs",
    active: "Actif",
    names: {
      Classic: "Classique",
      Teal: "Sarcelle",
      Warm: "Chaud",
      Monochrome: "Monochrome",
      Forest: "Forêt",
    },
  },
  about: {
    heading: "À propos",
    tagline: "Tableau de bord santé personnel",
    version: "v{{version}}",
    viewFullAbout: "Voir la page À propos complète",
  },
};

export default settings;
