/**
 * `analysis` namespace (French translation).
 *
 * Mirrors the key tree of `../en/analysis`.
 */

import type { AnalysisResource } from "../en/analysis";

const analysis: AnalysisResource = {
  page: {
    title: "Analyse",
    subtitle: "Taux de variation et résidus par rapport aux modèles de prédiction sélectionnés",
  },
  controls: {
    smoothingWindow: "Fenêtre de lissage :",
    extrapolationHorizon: "Horizon d'extrapolation",
    predictionModels: "Modèles de prédiction",
    rollingMean: "Moyenne glissante",
    exponentialDecay: "Décroissance exponentielle",
    linearTrend: "Tendance linéaire",
    showUncertaintyBand: "Afficher la bande d'incertitude",
  },
  horizon: {
    none: "Aucune",
    weeks_one: "{{count}} semaine",
    weeks_other: "{{count}} semaines",
    months_one: "{{count}} mois",
    months_other: "{{count}} mois",
  },
  explainerTitles: {
    weight: "Comment ce graphique fonctionne — lissage et modèles de prédiction",
    derivative: "Comment ce graphique fonctionne — taux de variation",
    residuals: "Comment ce graphique fonctionne — résidus et zones de déviation",
    energy: "Comment ce graphique fonctionne — bilan énergétique estimé",
  },
  weightExplainer: {
    smoothedHeading: "Courbe lissée — moyenne mobile centrée",
    smoothedBody:
      "Chaque point lissé est la moyenne de {{window}} mesures consécutives centrées sur lui. Cela atténue le bruit quotidien (rétention d'eau, horaire des repas) sans le décalage qu'introduirait une moyenne glissante rétrospective ; les premiers et derniers points utilisent les voisins disponibles.",
    expHeading: "Décroissance exponentielle — la forme de l'ensemble du parcours",
    expIntro:
      "La perte de poids ralentit généralement à l'approche d'un nouvel équilibre ; l'historique complet est donc ajusté par une exponentielle décroissante :",
    expFitIntro: "Votre ajustement actuel (t en jours depuis votre première mesure) :",
    expEquilibriumPrefix: "est le",
    expEquilibriumLabel: "poids d'équilibre prédit",
    expEquilibriumDashed: "— la ligne horizontale en pointillés.",
    expAboveEquilibrium: "correspond à votre écart initial au-dessus de l'équilibre ;",
    expDecayRate: "est le taux de décroissance par jour.",
    expHalfLifeLabel: "demi-vie",
    expHalfLifeBefore: "La",
    expHalfLifeIs: "de l'ajustement vaut",
    expHalfLifeApprox_one:
      "≈ {{days}} jour : tous les {{days}} jours, l'écart restant à l'équilibre est divisé par deux.",
    expHalfLifeApprox_other:
      "≈ {{days}} jours : tous les {{days}} jours, l'écart restant à l'équilibre est divisé par deux.",
    expCurrentSlope:
      "La pente du modèle à votre dernière mesure est de {{rate}} {{unit}}/semaine.",
    expNoConverge:
      "L'ajustement n'a pas convergé sur vos données actuelles, aucune valeur ajustée n'est donc affichée.",
    expRecencyLabel: "pondération de récence",
    expRecencyBefore: "L'ajustement minimise l'erreur quadratique avec une",
    expRecencyAfter:
      "— un point antérieur de 60 jours à votre dernier compte pour moitié moins — de sorte que la courbe suit votre situation actuelle plutôt que d'être ancrée par l'ancien historique. La bande ombrée est un intervalle de Monte-Carlo à 95 % : 200 jeux de paramètres sont tirés de la covariance de l'ajustement et la bande couvre les 95 % centraux des courbes résultantes.",
    linHeading: "Tendance linéaire — la direction que vous prenez actuellement",
    linIntroBefore:
      "Ceci répond à une question différente de l'ajustement exponentiel : où allez-vous à votre rythme",
    linIntroCurrent: "actuel",
    linIntroEstimator: "? Il utilise l'estimateur",
    linEstimatorLabel: "de Theil–Sen",
    linIntroWindow:
      "sur environ les {{days}} derniers jours — la médiane des pentes entre chaque paire de mesures :",
    linRobust:
      "Prendre une médiane plutôt qu'une moyenne des moindres carrés rend la pente robuste aux journées aberrantes isolées. La bande provient de l'intervalle de confiance sur la pente ; elle est donc de largeur nulle à votre dernière mesure et s'évase avec la distance.",
    linTrendPrefix: "Votre tendance actuelle est de",
    linTrendValue: "{{slope}} {{unit}}/semaine",
    linTrendCi:
      "(IC 95 % {{low}} à {{high}} {{unit}}/semaine)",
    linTrendFitOver: "ajustée sur {{count}} mesures",
    linTrendFallback:
      "— la fenêtre récente était trop clairsemée, toutes les données disponibles ont donc été utilisées",
    linNotEnough: "Pas assez de données récentes pour ajuster une tendance.",
  },
  derivativeExplainer: {
    rateHeading: "Taux de variation — une dérivée discrète",
    rateIntro:
      "Chaque barre est la variation de poids entre deux mesures consécutives divisée par le nombre réel de jours qui les séparent, ramenée à un taux hebdomadaire :",
    rateBody:
      "Utiliser les écarts de dates réels (et non le nombre de mesures) garantit que les entrées espacées irrégulièrement sont traitées correctement — sauter une semaine ne fausse pas le taux. Les barres négatives signifient que vous perdiez du poids sur cet intervalle ({{unit}}/semaine).",
    smoothedHeading: "Taux lissé",
    smoothedBody:
      "La ligne superposée est une moyenne mobile centrée sur 5 points des taux bruts. Les taux entre jours consécutifs sont extrêmement bruités (une seule variation de rétention d'eau les domine) ; c'est donc la ligne lissée qu'il faut lire pour votre rythme durable.",
  },
  energyExplainer: {
    balanceHeading: "Bilan énergétique d'après la tendance de poids",
    balanceIntro:
      "Une variation de masse corporelle a un coût énergétique approximatif ; le taux lissé de variation de poids se convertit donc directement en un bilan énergétique quotidien moyen :",
    balanceBody:
      "Chaque barre est le bilan quotidien estimé en kcal, en réutilisant le même taux lissé que le graphique du taux de variation (dw/dt en kg/jour). Les barres négatives correspondent à un déficit — vous mangiez en dessous de vos besoins ; les barres positives à un surplus. La constante est la densité énergétique de {{density}} kcal/kg de la variation de masse corporelle.",
    caveatsHeading: "Pourquoi c'est une estimation, pas un décompte calorique",
    caveatsBody:
      "Les variations de poids à court terme sont surtout de l'eau et du glycogène, pas de la graisse ; la barre d'une seule semaine peut donc être largement surestimée — lisez la tendance sur plusieurs semaines, jamais une seule barre. Le chiffre de {{density}} kcal/kg suppose que la variation est de la graisse pure et ignore l'adaptation métabolique ; considérez donc la valeur comme indicative plutôt qu'exacte.",
  },
  residualsExplainer: {
    residualsHeading: "Résidus — ce que le modèle ne peut pas expliquer",
    residualsIntro:
      "Chaque point est la différence entre une mesure et la prédiction du modèle à cette date :",
    residualsBody:
      "Un bon ajustement laisse les résidus dispersés aléatoirement autour de zéro. Une structure est porteuse d'information : une série de points dérivant vers le haut signifie que vous prenez du retard sur le rythme du modèle ; une série vers le bas signifie que vous le dépassez.",
    bandHeading: "La bande ±1σ et les zones de déviation",
    bandBodyBefore:
      "La bande ombrée couvre ±1 écart-type des résidus — environ deux tiers des points devraient y tomber. Par ailleurs, les mesures situées à plus de 0,5σ",
    bandAbove: "au-dessus",
    bandBodyMiddleBefore: "de l'ajustement exponentiel sont signalées comme zones de",
    bandPlateauLabel: "plateau",
    bandBodyMiddleAfter: "(progression plus lente que le modèle) et celles à plus de 0,5σ",
    bandBelow: "en dessous",
    bandBodyBeforeAcceleration: "sont signalées comme zones d'",
    bandAccelerationLabel: "accélération",
    bandBodyAfter: "; ces zones sont ombrées sur le graphique de poids principal.",
  },
  stats: {
    predictedEquilibrium: "Équilibre prédit",
    equilibriumAsymptote: "asymptote de décroissance exp.",
    halfLife: "Demi-vie",
    halfLifeDays: "{{days}} jours",
    halfLifeDetail: "l'écart à l'équilibre se divise par deux",
    modelRateToday: "Taux du modèle aujourd'hui",
    modelRateValue: "{{rate}} {{unit}}/sem",
    modelRateDetail: "pente de décroissance exp. actuelle",
    recentTrend: "Tendance récente",
    recentTrendValue: "{{slope}} {{unit}}/sem",
    recentTrendCi: "IC {{low}} à {{high}}",
    recentTrendTheilSen: "Theil–Sen, {{count}} points",
    fitScatter: "Dispersion de l'ajustement (σ)",
    fitScatterDetail: "sur {{count}} mesures",
  },
  axes: {
    heading: "Axes du graphique de poids",
    resetToAuto: "Réinitialiser en auto",
    presets: "Plages rapides",
    presetLabels: {
      weeks4: "4 dernières semaines",
      months3: "3 derniers mois",
      months6: "6 derniers mois",
      all: "Tout l'historique",
    },
    dateAxis: "Axe des dates",
    weightAxis: "Axe des poids (kg)",
    start: "Début",
    end: "Fin",
    stepDays: "Pas (jours)",
    min: "Min",
    max: "Max",
    step: "Pas",
    autoPlaceholder: "auto",
  },
};

export default analysis;
