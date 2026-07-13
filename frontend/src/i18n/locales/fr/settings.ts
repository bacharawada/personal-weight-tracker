/**
 * `settings` namespace (French).
 *
 * Mirrors the English `settings` resource key-for-key. Palette display labels
 * are translated; the underlying palette ids are untouched.
 */

import type { SettingsResource } from "../en/settings";

const settings: SettingsResource = {
  title: "Paramètres",
  subtitle: "Personnalisez l'apparence et exportez vos données",
  appearance: {
    heading: "Apparence",
    theme: "Thème",
    currently: "Actuellement : {{mode}}",
    dark: "Sombre",
    light: "Clair",
    switchToDark: "Passer en sombre",
    switchToLight: "Passer en clair",
  },
  palette: {
    heading: "Palette de couleurs",
    active: "Actif",
    names: {
      Classic: "Classique",
      Teal: "Sarcelle",
      Warm: "Chaud",
      Monochrome: "Monochrome",
      Forest: "Forêt",
    },
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
  about: {
    heading: "À propos",
    tagline: "Tableau de bord santé personnel",
    version: "v{{version}}",
    viewFullAbout: "Voir la page À propos complète",
  },
};

export default settings;
