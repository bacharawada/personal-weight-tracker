/**
 * `common` namespace (French).
 *
 * Typed against the English source so any missing or extra key is a compile
 * error, keeping the two dictionaries in lockstep.
 */

import type { CommonResource } from "../en/common";

const common: CommonResource = {
  appName: "Weight Tracker",
  actions: {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    close: "Fermer",
    add: "Ajouter",
    edit: "Modifier",
    remove: "Retirer",
    confirm: "Confirmer",
    retry: "Réessayer",
    back: "Retour",
    next: "Suivant",
    finish: "Terminer",
    continue: "Continuer",
  },
  status: {
    loading: "Chargement…",
    saving: "Enregistrement…",
    error: "Une erreur est survenue.",
    empty: "Aucune donnée pour le moment.",
  },
  datePicker: {
    label: {
      day: "Jour",
      month: "Mois",
      year: "Année",
    },
    placeholder: {
      day: "jj",
      month: "mm",
      year: "aaaa",
    },
    openCalendar: "Ouvrir le calendrier",
    clear: "Effacer la date",
  },
};

export default common;
