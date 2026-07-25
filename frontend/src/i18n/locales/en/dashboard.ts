/**
 * `dashboard` namespace (English — source of truth).
 *
 * Copy for every dashboard module: the insight headline, the welcome and locked
 * states, the trajectory panel, the goal ring, pace, consistency, momentum,
 * energy, BMI (including the standard category names) and the event timeline.
 *
 * The `stats.*` block outlives the stat row it was written for: the public share
 * page still renders those five labels.
 */

const dashboard = {
  page: {
    title: "Dashboard",
    subtitle: "Overview of your weight progression",
  },
  // One headline picked by lib/dashboard/insight.ts. Each sentence says
  // something no single tile does — it joins two of them.
  insight: {
    goalReached: "You've reached your goal weight. Well done.",
    doseWorking:
      "{{medication}} stepped up on {{date}} — your pace went from {{before}} to {{after}} since.",
    plateauWithHistory_one:
      "Plateau for {{days}} days. Your {{count}} previous plateau lasted {{avgDays}} days, and it ended.",
    plateauWithHistory_other:
      "Plateau for {{days}} days. Your {{count}} previous plateaus lasted {{avgDays}} days on average, and they all ended.",
    plateau: "Plateau for {{days}} days — the trend has been flat for a while.",
    gaining: "Your weight is drifting up at {{rate}}.",
    behindTarget_one:
      "You're behind your target date by {{count}} day — currently projected {{date}}.",
    behindTarget_other:
      "You're behind your target date by {{count}} days — currently projected {{date}}.",
    onTrack: "On track to meet your target — projected {{date}}.",
    projected: "At {{rate}} you reach your goal around {{date}}.",
    losing: "Steady loss at {{rate}}.",
    streak: "{{days}} days of weighing in without a miss.",
  },
  welcome: {
    title: "Your dashboard starts with one weigh-in",
    body:
      "Everything here is derived from your measurements — nothing to configure, nothing to log by hand. Record a weight and the page starts filling in.",
    steps: {
      first: "One measurement: your current weight and the weigh-in calendar",
      trend: "{{count}} measurements over a week: the trend and its projection",
      goal: "A goal weight in Settings: progress ring, milestones, and the pace you need",
      energy: "{{count}} days of history: energy balance and plateau detection",
    },
    cta: "Add your first measurement",
  },
  locked: {
    needMeasurements_one: "{{count}} more weigh-in and this fills in.",
    needMeasurements_other: "{{count}} more weigh-ins and this fills in.",
    needDays_one: "{{count}} more day of tracking and this fills in.",
    needDays_other: "{{count}} more days of tracking and this fills in.",
    needGoal: "Set a goal weight in Settings to unlock this.",
    needHeight: "Add your height in Settings to unlock this.",
  },
  trajectory: {
    currentWeight: "Current weight",
    noWeight: "Add a measurement to start your trajectory.",
    last7Days: "7 days",
    last30Days: "30 days",
    sinceStart: "Since start",
    // Shown in place of a delta when the window has no earlier measurement.
    noComparison: "—",
  },
  stats: {
    totalLoss: "Total Loss",
    avgLossPerWeek: "Avg Loss/Week",
    currentTrend: "Current Trend",
    daysTracked: "Days Tracked",
    measurements: "Measurements",
  },
  goal: {
    label: "Goal",
    onTrack: "On track",
    behind: "Behind",
    reached: "Reached",
    remaining: "{{value}} to go",
    projectedDate: "Projected {{date}}",
    ringLabel: "{{percent}}% of the way to your goal",
    // Projection summaries. The backend returns a status plus raw numbers;
    // `goal` and `rate` arrive already converted to the user's unit and `date`
    // already formatted to their date preference.
    status: {
      noGoal: "No goal weight set.",
      noData: "Add measurements to project your goal.",
      alreadyReached: "Goal already reached.",
      insufficientData: "Not enough data yet to model a reliable projection.",
      notTrendingDown:
        "Your weight isn't trending down over the last {{weeks}} weeks, so {{goal}} isn't projectable yet.",
      beyondHorizon:
        "At about {{rate}}, {{goal}} is over {{years}} years away — too far out to project reliably.",
      onTrack: "On track to reach {{goal}} by {{date}} at about {{rate}}.",
      behindTarget_one:
        "Behind target: at about {{rate}} you'd reach {{goal}} on {{date}}, {{count}} day after your target.",
      behindTarget_other:
        "Behind target: at about {{rate}} you'd reach {{goal}} on {{date}}, {{count}} days after your target.",
      projected: "At about {{rate}} you're on track to reach {{goal}} around {{date}}.",
    },
    range: {
      between: "Between {{from}} and {{to}}.",
      earliest: "{{date}} at the earliest; later if your rate slows.",
    },
  },
  timeline: {
    label: "Timeline",
    empty: "Milestones, plateaus and dose changes will show up here.",
    start: "Tracking started",
    milestone: "Milestone {{index}} reached",
    plateau_one: "Plateau of {{count}} day",
    plateau_other: "Plateau of {{count}} days",
    plateauUntil: "Until {{date}}",
    doseStarted: "{{medication}} started at {{dose}}",
    doseChanged: "{{medication}} {{from}} → {{to}}",
    paceShift: "Pace {{before}} → {{after}}",
    more_one: "+{{count}} earlier event",
    more_other: "+{{count}} earlier events",
  },
  consistency: {
    label: "Consistency",
    streak_zero: "No current streak",
    streak_one: "{{count}} day streak",
    streak_other: "{{count}} day streak",
    summary_one: "{{count}} weigh-in over {{weeks}} weeks",
    summary_other: "{{count}} weigh-ins over {{weeks}} weeks",
    daysTracked_one: "Tracking for {{count}} day",
    daysTracked_other: "Tracking for {{count}} days",
  },
  momentum: {
    label: "Momentum",
    barsLabel: "Weekly change over the last {{count}} weeks",
    losingWeeks: "{{losing}} of {{total}} weeks down",
  },
  pace: {
    label: "Pace",
    required: "needed {{value}}",
    typicalRange: "Typical loss range {{from}}–{{to}} {{unit}}/week",
    meterLabel: "Current pace {{value}}",
    insufficient: "Add a few more measurements to see your pace.",
    noTargetDate: "Set a target date in Settings to see the pace you need.",
    targetDatePassed: "Your target date has passed.",
    badge: {
      onTrack: "Fast enough",
      tooSlow: "Too slow",
      notMoving: "Not moving",
    },
  },
  bmi: {
    label: "Body Mass Index",
    addMeasurement: "Add a measurement to see your BMI.",
    atGoal: "{{value}} at goal",
    scaleLabel: "BMI {{value}}, {{category}}",
    category: {
      underweight: "Underweight",
      normal: "Normal",
      overweight: "Overweight",
      obese: "Obese",
    },
  },
  milestones: {
    label: "Milestones",
    counter: "{{achieved}}/{{total}}",
  },
  plateau: {
    plateauBadge_one: "Plateau for {{count}} day",
    plateauBadge_other: "Plateau for {{count}} days",
    losingBadge: "Steady loss",
    gainingBadge: "Regaining",
    recentRate: "Recent rate",
    historySummary_one: "{{count}} past plateau, avg {{avgDays}} day",
    historySummary_other: "{{count}} past plateaus, avg {{avgDays}} days",
    explainer:
      "A plateau: your trend has stayed within 0.1 kg/week for at least 14 days.",
    insufficientData: "Add a few more measurements to see your plateau status.",
  },
  energy: {
    label: "Estimated energy balance",
    deficit: "Deficit ~{{value}} kcal/day",
    surplus: "Surplus ~{{value}} kcal/day",
    maintenance: "Roughly at maintenance",
    range: "{{low}} to {{high}} kcal/day",
    sparklineLabel: "Estimated daily balance over time",
    window_one: "Over the last {{count}} day",
    window_other: "Over the last {{count}} days",
    insufficient:
      "Add a few weeks of measurements to estimate your energy balance.",
  },
};

export type DashboardResource = typeof dashboard;

export default dashboard;
