/**
 * `profile` namespace (English — source of truth).
 *
 * Copy for the profile page: page title/subtitle, the identity fallback name,
 * the goal & body panel (height/goal/target-date fields, the metabolism inputs
 * and their placeholders), the save feedback, the metabolism card (BMR / TDEE /
 * implied intake and the activity ladder), and the public sharing section.
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
      sex: "Sex",
      birthDate: "Date of birth",
      activity: "Activity level",
    },
    sex: {
      male: "Male",
      female: "Female",
      hint: "Biological sex, as an input of the metabolism formula only.",
    },
    activityHint: "Pick the level that best matches a typical week.",
    placeholders: {
      height: "e.g. 178",
      goalLb: "e.g. 165",
      goalKg: "e.g. 75",
    },
    saved: "Saved",
    save: "Save profile",
    saving: "Saving…",
  },
  metabolism: {
    heading: "Metabolism",
    description:
      "Basal metabolic rate (Mifflin-St Jeor) and daily energy expenditure, estimated from your latest weigh-in. Population formulas: expect about ±10 %.",
    loading: "Estimating…",
    loadError: "Could not load your metabolism estimate.",
    missing: "To estimate your metabolism, add: {{items}}.",
    inputs: {
      weight: "a weigh-in",
      height: "your height",
      sex: "your sex",
      birth_date: "your date of birth",
    },
    bmr: "Basal metabolic rate",
    tdee: "Daily energy expenditure",
    unit: "kcal/day",
    kcalPerDay: "{{value}} kcal/day",
    pickActivity: "Pick an activity level above to get your daily expenditure.",
    intake: "Estimated intake ~{{value}} kcal/day",
    intakeRange: "({{low}} to {{high}})",
    intakeHint:
      "Daily expenditure plus the energy balance read from your weight trend — what the scale says you are eating, on average. Only as good as the activity level you picked.",
    intakeUnavailable:
      "Add a few weeks of measurements and your estimated intake will appear here.",
    basis: "Based on {{weight}}, your height and an age of {{age}}.",
    activity: {
      sedentary: {
        label: "Sedentary",
        shortLabel: "Sedentary",
        description: "Desk job, little or no exercise",
      },
      light: {
        label: "Lightly active",
        shortLabel: "Light",
        description: "Light exercise or sport 1–3 days a week",
      },
      moderate: {
        label: "Moderately active",
        shortLabel: "Moderate",
        description: "Moderate exercise 3–5 days a week",
      },
      active: {
        label: "Active",
        shortLabel: "Active",
        description: "Hard exercise 6–7 days a week",
      },
      very_active: {
        label: "Very active",
        shortLabel: "Very",
        description: "Hard daily training or a physical job",
      },
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
};

export type ProfileResource = typeof profile;

export default profile;
