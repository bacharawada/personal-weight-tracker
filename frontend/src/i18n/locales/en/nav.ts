/**
 * `nav` namespace (English — source of truth).
 *
 * Sidebar navigation, the theme and language toggles, and the account
 * dropdown — everything rendered by the app shell chrome.
 */

const nav = {
  links: {
    dashboard: "Dashboard",
    analysis: "Analysis",
    data: "Data",
    settings: "Settings",
  },
  sidebar: {
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
  },
  theme: {
    light: "Light mode",
    dark: "Dark mode",
  },
  language: {
    switchTo: "Switch to {{language}}",
  },
  account: {
    fallback: "Account",
    profile: "Profile & goal",
    signOut: "Sign out",
  },
};

export type NavResource = typeof nav;

export default nav;
