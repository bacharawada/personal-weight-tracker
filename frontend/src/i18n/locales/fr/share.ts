/**
 * `share` namespace (French).
 *
 * Mirrors the English `share` resource key-for-key.
 */

import type { ShareResource } from "../en/share";

const share: ShareResource = {
  badge: "Lecture seule",
  title: "Tableau de bord partagé",
  subtitle: "Une vue en lecture seule d'un suivi de poids.",
  chartHeading: "Évolution du poids",
  statsHeading: "Résumé",
  invalidTitle: "Lien indisponible",
  invalidBody:
    "Ce lien de partage est invalide ou a été désactivé par son propriétaire.",
  poweredBy: "Propulsé par {{app}}",
  toggleTheme: "Changer de thème",
  toggleLanguage: "Changer de langue",
};

export default share;
