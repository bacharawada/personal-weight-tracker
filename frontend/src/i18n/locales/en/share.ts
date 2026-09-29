/**
 * `share` namespace (English — source of truth).
 *
 * Copy for the standalone public shared-dashboard page (`/share/:token`).
 * This page renders outside the app shell and the auth context, so it does
 * not reuse the dashboard chrome; trajectory labels are borrowed from the
 * `dashboard` namespace and chart copy from `analysis` at render time.
 */

const share = {
  badge: "View only",
  title: "Shared weight dashboard",
  subtitle: "A read-only view of a weight-loss journey.",
  daysTracked_one: "{{count}} day tracked",
  daysTracked_other: "{{count}} days tracked",
  measurementCount_one: "{{count}} weigh-in",
  measurementCount_other: "{{count}} weigh-ins",
  invalidTitle: "Link unavailable",
  invalidBody: "This share link is invalid or has been disabled by its owner.",
  poweredBy: "Powered by {{app}}",
  toggleTheme: "Toggle theme",
  toggleLanguage: "Switch language",
};

export type ShareResource = typeof share;

export default share;
