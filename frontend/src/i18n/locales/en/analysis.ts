/**
 * `analysis` namespace (English — source of truth).
 *
 * Copy for the Analysis page: control labels, chart section titles, the
 * methodology explainers, the model stats strip, and the axis controls.
 */

const analysis = {
  page: {
    title: "Analysis",
    subtitle: "Rate of change and residuals vs. your selected prediction models",
  },
  controls: {
    heading: "Chart controls",
    reset: "Reset",
    smoothingWindow: "Smoothing window",
    smoothingValue_one: "{{count}} point",
    smoothingValue_other: "{{count}} points",
    smoothingHint:
      "Each point is averaged with its neighbours — a wider window is smoother but reacts later to a change of pace.",
    smoothingNeedsRollingMean:
      "Only the rolling mean uses this window — turn that line on to change it.",
    extrapolationHorizon: "Projection",
    horizonHint: "How far past your last measurement each model is extended.",
    predictionModels: "Series shown",
    rollingMean: "Rolling mean",
    exponentialDecay: "Exponential decay",
    linearTrend: "Linear trend",
    showUncertaintyBand: "Uncertainty band",
    bandNeedsModel: "Turn on a prediction model to see its uncertainty band",
    summarySmoothing: "{{count}}-point smoothing",
    summaryProjection: "{{horizon}} ahead",
    summaryNoProjection: "no projection",
    summarySeries_one: "{{count}} series",
    summarySeries_other: "{{count}} series",
  },
  horizon: {
    none: "None",
    weeks_one: "{{count}} week",
    weeks_other: "{{count}} weeks",
    months_one: "{{count}} month",
    months_other: "{{count}} months",
    short_none: "None",
    short_weeks_one: "{{count}} w",
    short_weeks_other: "{{count}} w",
    short_months_one: "{{count}} mo",
    short_months_other: "{{count}} mo",
  },
  chartTitles: {
    weight: "Evolution of weight ({{unit}}) as a function of time (days)",
    derivative:
      "Evolution of the rate of change ({{unit}}/week) as a function of time (days)",
    energy: "Evolution of the energy balance (kcal/day) as a function of time (days)",
    residuals: "Evolution of the residuals ({{unit}}) as a function of time (days)",
  },
  explainerTitles: {
    weight: "How this chart works — smoothing and prediction models",
    derivative: "How this chart works — rate of change",
    residuals: "How this chart works — residuals and deviation zones",
    energy: "How this chart works — estimated energy balance",
  },
  weightExplainer: {
    smoothedHeading: "Smoothed line — centred rolling mean",
    smoothedBody:
      "Each smoothed point is the average of {{window}} consecutive measurements centred on it. This damps day-to-day noise (water weight, meal timing) without the lag a trailing average would introduce; the first and last points use whatever neighbours exist.",
    expHeading: "Exponential decay — the shape of the whole journey",
    expIntro:
      "Weight loss typically slows as you approach a new equilibrium, so the full history is fit with a decaying exponential:",
    expFitIntro: "Your current fit (t in days since your first measurement):",
    expEquilibriumPrefix: "is the predicted",
    expEquilibriumLabel: "equilibrium weight",
    expEquilibriumDashed: "— the dashed horizontal line.",
    expAboveEquilibrium: "is how far above equilibrium you started;",
    expDecayRate: "is the decay rate per day.",
    expHalfLifeLabel: "half-life",
    expHalfLifeBefore: "The fit's",
    expHalfLifeIs: "is",
    expHalfLifeApprox_one:
      "≈ {{days}} day: every {{days}} days, the remaining gap to equilibrium halves.",
    expHalfLifeApprox_other:
      "≈ {{days}} days: every {{days}} days, the remaining gap to equilibrium halves.",
    expCurrentSlope:
      "The model's slope at your latest measurement is {{rate}} {{unit}}/week.",
    expNoConverge:
      "The fit did not converge on your current data, so no fitted values are shown.",
    expRecencyLabel: "recency weighting",
    expRecencyBefore: "The fit minimises squared error with",
    expRecencyAfter:
      "— a point 60 days older than your latest counts half as much — so the curve tracks where you are now rather than being anchored by old history. The shaded band is a Monte-Carlo 95% interval: 200 parameter sets are drawn from the fit's covariance and the band spans the middle 95% of the resulting curves.",
    linHeading: "Linear trend — where you are heading right now",
    linIntroBefore:
      "This answers a different question than the exponential fit: at your",
    linIntroCurrent: "current",
    linIntroEstimator: "rate, where are you going? It uses the",
    linEstimatorLabel: "Theil–Sen estimator",
    linIntroWindow:
      "over roughly the last {{days}} days — the median of the slopes between every pair of measurements:",
    linRobust:
      "Taking a median instead of a least-squares average makes the slope robust to single outlier days. The band comes from the confidence interval on the slope, so it is zero-width at your latest measurement and fans out with distance.",
    linTrendPrefix: "Your current trend is",
    linTrendValue: "{{slope}} {{unit}}/week",
    linTrendCi:
      "(95% CI {{low}} to {{high}} {{unit}}/week)",
    linTrendFitOver: "fit over {{count}} measurements",
    linTrendFallback:
      "— the recent window was too sparse, so all available data was used",
    linNotEnough: "Not enough recent data to fit a trend.",
  },
  derivativeExplainer: {
    rateHeading: "Rate of change — a discrete derivative",
    rateIntro:
      "Each bar is the weight change between two consecutive measurements divided by the actual number of days between them, scaled to a weekly rate:",
    rateBody:
      "Using real date gaps (not measurement counts) means unevenly spaced entries are handled correctly — skipping a week does not distort the rate. Negative bars mean you were losing weight over that interval ({{unit}}/week).",
    smoothedHeading: "Smoothed rate",
    smoothedBody:
      "The overlaid line is a 5-point centred rolling mean of the raw rates. Consecutive-day rates are extremely noisy (a single water-weight swing dominates them), so the smoothed line is the one to read for your sustained pace.",
  },
  energyExplainer: {
    balanceHeading: "Energy balance from the weight trend",
    balanceIntro:
      "A change in body mass has an approximate energy cost, so the smoothed rate of weight change converts directly into an average daily energy balance:",
    balanceBody:
      "Each bar is the estimated daily balance in kcal, reusing the same smoothed rate as the rate-of-change chart (dw/dt in kg/day). Negative bars are a deficit — you were eating below your needs; positive bars a surplus. The constant is the {{density}} kcal/kg energy density of body-mass change.",
    caveatsHeading: "Why this is an estimate, not a calorie count",
    caveatsBody:
      "Short-term weight swings are mostly water and glycogen, not fat, so a single week's bar can be wildly overstated — read the multi-week trend, never one bar. The {{density}} kcal/kg figure assumes the change is pure fat and ignores metabolic adaptation, so treat the number as directional rather than exact.",
  },
  residualsExplainer: {
    residualsHeading: "Residuals — what the model cannot explain",
    residualsIntro:
      "Each point is the difference between a measurement and the model's prediction on that date:",
    residualsBody:
      "A good fit leaves residuals scattered randomly around zero. Structure is information: a run of points drifting upward means you are falling behind the model's pace; a downward run means you are beating it.",
    bandHeading: "The ±1σ band and deviation zones",
    bandBodyBefore:
      "The shaded band spans ±1 standard deviation of the residuals — roughly two thirds of the points should fall inside it. Separately, measurements more than 0.5σ",
    bandAbove: "above",
    bandBodyMiddleBefore: "the exponential fit are flagged as",
    bandPlateauLabel: "plateau",
    bandBodyMiddleAfter: "zones (progress slower than the model) and more than 0.5σ",
    bandBelow: "below",
    bandBodyBeforeAcceleration: "it as",
    bandAccelerationLabel: "acceleration",
    bandBodyAfter: "zones; those zones are shaded on the main weight chart.",
  },
  stats: {
    predictedEquilibrium: "Predicted equilibrium",
    equilibriumAsymptote: "exp. decay asymptote",
    halfLife: "Half-life",
    halfLifeDays: "{{days}} days",
    halfLifeDetail: "gap to equilibrium halves",
    modelRateToday: "Model rate today",
    modelRateValue: "{{rate}} {{unit}}/wk",
    modelRateDetail: "exp. decay slope now",
    recentTrend: "Recent trend",
    recentTrendValue: "{{slope}} {{unit}}/wk",
    recentTrendCi: "CI {{low}} to {{high}}",
    recentTrendTheilSen: "Theil–Sen, {{count}} points",
    fitScatter: "Fit scatter (σ)",
    fitScatterDetail: "over {{count}} measurements",
  },
  axes: {
    heading: "Weight chart axes",
    resetToAuto: "Reset to auto",
    presets: "Quick ranges",
    presetLabels: {
      weeks4: "Last 4 weeks",
      months3: "Last 3 months",
      months6: "Last 6 months",
      all: "All time",
    },
    presetShortLabels: {
      weeks4: "4 w",
      months3: "3 mo",
      months6: "6 mo",
      all: "All",
    },
    dateAxis: "Date axis",
    weightAxis: "Weight axis (kg)",
    start: "Start",
    end: "End",
    stepDays: "Step (days)",
    min: "Min",
    max: "Max",
    step: "Step",
    autoPlaceholder: "auto",
    chartHeight: "Chart height",
    chartHeightValue: "{{value}} px",
    chartHeightHint:
      "A taller plot spreads the weight gridlines further apart — raise it when a fine step packs them too tightly.",
  },
};

export type AnalysisResource = typeof analysis;

export default analysis;
