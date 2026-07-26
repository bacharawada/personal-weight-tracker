/**
 * `settings` namespace (French).
 *
 * Mirrors the English `settings` resource key-for-key. Palette display labels
 * are translated; the underlying palette ids are untouched.
 */

import type { SettingsResource } from "../en/settings";

const settings: SettingsResource = {
  title: "Paramètres",
  subtitle: "Personnalisez l'apparence et le format de vos données",
  appearance: {
    heading: "Apparence",
    theme: "Thème",
    language: "Langue",
    currently: "Actuellement : {{mode}}",
    dark: "Sombre",
    light: "Clair",
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
  unitsFormats: {
    heading: "Unités et formats",
    unit: {
      label: "Unité de poids",
      helper: "Afficher les poids en kilogrammes ou en livres",
    },
    dateOrder: {
      label: "Format de date",
      helper: "S'applique partout où une date est affichée",
      european: "Européen",
      american: "Américain",
      iso: "ISO 8601",
    },
    separator: {
      label: "Séparateur",
      helper: "Caractère entre les champs de la date",
      isoHelper: "Le format ISO utilise toujours le tiret",
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
