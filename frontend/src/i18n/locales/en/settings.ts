/**
 * `settings` namespace (English — source of truth).
 *
 * Copy for the SettingsPage: page title/subtitle, appearance/theme controls,
 * the colour-palette picker (labels only — palette ids stay untranslated),
 * and the About section.
 */

const settings = {
  title: "Settings",
  subtitle: "Customize the appearance and export your data",
  appearance: {
    heading: "Appearance",
    theme: "Theme",
    currently: "Currently: {{mode}}",
    dark: "Dark",
    light: "Light",
    switchToDark: "Switch to Dark",
    switchToLight: "Switch to Light",
  },
  palette: {
    heading: "Colour Palette",
    active: "Active",
    names: {
      Classic: "Classic",
      Teal: "Teal",
      Warm: "Warm",
      Monochrome: "Monochrome",
      Forest: "Forest",
    },
  },
  about: {
    heading: "About",
    tagline: "Personal health dashboard",
    version: "v{{version}}",
    viewFullAbout: "View full About page",
  },
};

export type SettingsResource = typeof settings;

export default settings;
