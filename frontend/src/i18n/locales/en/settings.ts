/**
 * `settings` namespace (English — source of truth).
 *
 * Copy for the SettingsPage: page title/subtitle, appearance/theme controls,
 * the colour-palette picker (labels only — palette ids stay untranslated),
 * the units & date-format section, and the About section.
 */

const settings = {
  title: "Settings",
  subtitle: "Customize how the app looks and formats your data",
  appearance: {
    heading: "Appearance",
    theme: "Theme",
    language: "Language",
    currently: "Currently: {{mode}}",
    dark: "Dark",
    light: "Light",
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
  unitsFormats: {
    heading: "Units & Formats",
    unit: {
      label: "Weight unit",
      helper: "Display weights in kilograms or pounds",
    },
    dateOrder: {
      label: "Date format",
      helper: "Applies everywhere a date is displayed",
      european: "European",
      american: "American",
      iso: "ISO 8601",
    },
    separator: {
      label: "Separator",
      helper: "Character between the date fields",
      isoHelper: "The ISO format always uses a dash",
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
