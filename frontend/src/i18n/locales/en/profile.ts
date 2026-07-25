/**
 * `profile` namespace (English — source of truth).
 *
 * Copy for the profile page: page title/subtitle, the identity fallback name,
 * the goal & body panel (height/goal/target-date fields and their
 * placeholders), the save feedback, and the public sharing section.
 */

const profile = {
  page: {
    title: "Profile",
    subtitle: "Your account, your goal and who you share it with",
  },
  identity: {
    fallbackName: "Account",
  },
  goalBody: {
    heading: "Goal & Body",
    fields: {
      height: "Height (cm)",
      goal: "Goal weight ({{unit}})",
      targetDate: "Target date",
    },
    placeholders: {
      height: "e.g. 178",
      goalLb: "e.g. 165",
      goalKg: "e.g. 75",
      targetDate: "Pick a date",
    },
    saved: "Saved",
    save: "Save profile",
    saving: "Saving…",
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
};

export type ProfileResource = typeof profile;

export default profile;
