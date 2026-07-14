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
