/** `nav` namespace (French). Typed against the English source for key parity. */

import type { NavResource } from "../en/nav";

const nav: NavResource = {
  links: {
    dashboard: "Tableau de bord",
    analysis: "Analyse",
    data: "Données",
    settings: "Paramètres",
  },
  sidebar: {
    expand: "Déplier la barre latérale",
    collapse: "Replier la barre latérale",
  },
  theme: {
    light: "Mode clair",
    dark: "Mode sombre",
  },
  language: {
    switchTo: "Passer en {{language}}",
  },
  account: {
    fallback: "Compte",
    profile: "Profil et objectif",
    signOut: "Se déconnecter",
  },
};

export default nav;
