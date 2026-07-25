/**
 * `profile` namespace (French).
 *
 * Mirrors the English `profile` resource key-for-key.
 */

import type { ProfileResource } from "../en/profile";

const profile: ProfileResource = {
  page: {
    title: "Profil",
    subtitle: "Votre compte, votre objectif et vos partages",
  },
  identity: {
    fallbackName: "Compte",
  },
  goalBody: {
    heading: "Objectif et corpulence",
    fields: {
      height: "Taille (cm)",
      goal: "Poids cible ({{unit}})",
      targetDate: "Date cible",
    },
    placeholders: {
      height: "ex. 178",
      goalLb: "ex. 165",
      goalKg: "ex. 75",
    },
    saved: "Enregistré",
    save: "Enregistrer le profil",
    saving: "Enregistrement…",
  },
};

export default profile;
