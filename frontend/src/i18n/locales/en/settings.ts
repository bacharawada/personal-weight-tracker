/**
 * `settings` namespace (English — source of truth).
 *
 * Copy for the SettingsPage: page title/subtitle, appearance/theme controls,
 * the colour-palette picker (labels only — palette ids stay untranslated),
 * the units & date-format section, and the About section.
 *
 * The `share.*` keys stay in this namespace even though the sharing section is
 * rendered from the profile page.
 */

const settings = {
  title: "Settings",
  subtitle: "Customize how the app looks and formats your data",
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
  share: {
    heading: "Sharing",
    description:
      "Publish a read-only link to your weight chart. You can disable it at any time.",
    off: "Public sharing is off",
    on: "Public sharing is on",
    enable: "Enable sharing",
    linkLabel: "Public link",
    copy: "Copy",
    copied: "Copied",
    regenerate: "Regenerate",
    revoke: "Disable sharing",
    warning:
      "Anyone with this link can view your weight charts and stats. Only share it with people you trust.",
    loadError: "Could not load sharing status.",
    regenTitle: "Regenerate share link?",
    regenBody:
      "The current link will stop working immediately. Anyone using it will lose access.",
    regenConfirm: "Regenerate",
    revokeTitle: "Disable sharing?",
    revokeBody:
      "The link will stop working immediately and your dashboard will no longer be public.",
    revokeConfirm: "Disable",
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
