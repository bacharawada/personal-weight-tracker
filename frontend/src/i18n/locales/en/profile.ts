/**
 * `profile` namespace (English — source of truth).
 *
 * Copy for the profile page: page title/subtitle, the identity fallback name,
 * the goal & body panel (units toggle, height/goal/target-date fields and
 * their placeholders) and the save feedback.
 */

const profile = {
  page: {
    title: "Profile",
    subtitle: "Your account, goal and measurement units",
  },
  identity: {
    fallbackName: "Account",
  },
  goalBody: {
    heading: "Goal & Body",
    units: {
      label: "Units",
      helper: "Display weights in kilograms or pounds",
    },
    fields: {
      height: "Height (cm)",
      goal: "Goal weight ({{unit}})",
      targetDate: "Target date",
    },
    placeholders: {
      height: "e.g. 178",
      goalLb: "e.g. 165",
      goalKg: "e.g. 75",
    },
    saved: "Saved",
    save: "Save profile",
    saving: "Saving…",
  },
};

export type ProfileResource = typeof profile;

export default profile;
