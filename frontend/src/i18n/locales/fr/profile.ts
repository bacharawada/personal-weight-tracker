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
      sex: "Formule métabolique",
      birthDate: "Date de naissance",
      activity: "Niveau d'activité",
    },
    sex: {
      male: "Homme",
      female: "Femme",
      other: "Moyenne / autre",
      otherShort: "Autre",
      clear: "Effacer",
      hint: "La formule existe en deux variantes. Choisissez celle qui correspond à votre profil hormonal — c'est un coefficient, pas une identité.",
      otherHint: "Utilise le point médian des deux variantes, avec une fourchette d'incertitude élargie affichée sur l'estimation.",
    },
    activityHint: "Choisissez le niveau qui décrit le mieux une semaine type.",
    placeholders: {
      height: "ex. 178",
      goalLb: "ex. 165",
      goalKg: "ex. 75",
    },
    saved: "Enregistré",
    save: "Enregistrer le profil",
    saving: "Enregistrement…",
  },
  metabolism: {
    heading: "Métabolisme",
    description:
      "Métabolisme de base (Mifflin-St Jeor) et dépense énergétique journalière, estimés à partir de votre dernière pesée. Formules de population : comptez environ ±10 %.",
    loading: "Estimation…",
    loadError: "Impossible de charger l'estimation de votre métabolisme.",
    missing: "Pour estimer votre métabolisme, ajoutez : {{items}}.",
    inputs: {
      weight: "une pesée",
      height: "votre taille",
      sex: "votre sexe",
      birth_date: "votre date de naissance",
    },
    bmr: "Métabolisme de base",
    tdee: "Dépense énergétique journalière",
    unit: "kcal/jour",
    kcalPerDay: "{{value}} kcal/jour",
    plusMinus: "± {{value}} kcal/jour",
    otherVariantNote: "La fourchette ± vient de la variante moyenne de la formule.",
    pickActivity: "Choisissez un niveau d'activité ci-dessus pour obtenir votre dépense journalière.",
    intake: "Apport estimé ~{{value}} kcal/jour",
    intakeRange: "({{low}} à {{high}})",
    intakeHint:
      "Dépense journalière plus le bilan énergétique lu sur votre tendance de poids — ce que la balance dit que vous mangez, en moyenne. Aussi fiable que le niveau d'activité choisi.",
    intakeUnavailable:
      "Ajoutez quelques semaines de mesures et votre apport estimé apparaîtra ici.",
    basis: "Basé sur {{weight}}, votre taille et un âge de {{age}} ans.",
    activity: {
      sedentary: {
        label: "Sédentaire",
        shortLabel: "Sédentaire",
        description: "Travail de bureau, peu ou pas d'exercice",
      },
      light: {
        label: "Légèrement actif",
        shortLabel: "Léger",
        description: "Exercice léger 1 à 3 jours par semaine",
      },
      moderate: {
        label: "Modérément actif",
        shortLabel: "Modéré",
        description: "Exercice modéré 3 à 5 jours par semaine",
      },
      active: {
        label: "Actif",
        shortLabel: "Actif",
        description: "Exercice intense 6 à 7 jours par semaine",
      },
      very_active: {
        label: "Très actif",
        shortLabel: "Très",
        description: "Entraînement intense quotidien ou métier physique",
      },
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
};

export default profile;
