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
  share: {
    heading: "Partage",
    description:
      "Publiez un lien en lecture seule vers votre courbe de poids. Vous pouvez le désactiver à tout moment.",
    off: "Le partage public est désactivé",
    on: "Le partage public est activé",
    enable: "Activer le partage",
    linkLabel: "Lien public",
    copy: "Copier",
    copied: "Copié",
    regenerate: "Régénérer",
    revoke: "Désactiver le partage",
    warning:
      "Toute personne disposant de ce lien peut voir vos courbes de poids et vos statistiques. Ne le partagez qu'avec des personnes de confiance.",
    loadError: "Impossible de charger l'état du partage.",
    regenTitle: "Régénérer le lien de partage ?",
    regenBody:
      "Le lien actuel cessera immédiatement de fonctionner. Toute personne l'utilisant perdra l'accès.",
    regenConfirm: "Régénérer",
    revokeTitle: "Désactiver le partage ?",
    revokeBody:
      "Le lien cessera immédiatement de fonctionner et votre tableau de bord ne sera plus public.",
    revokeConfirm: "Désactiver",
  },
};

export default profile;
