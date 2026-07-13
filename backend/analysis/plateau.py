"""Plateau detection — surfaces an existing signal as a first-class feature.

Two separate questions, both derived from data already produced elsewhere
in this package:

1. *Am I on a plateau right now?* Answered from the robust recent trend
   (see :mod:`analysis.trend`): a near-zero slope over a genuinely recent
   window means "plateau", a negative slope means "losing", a positive
   slope means "gaining".
2. *Have I plateaued before?* Answered by re-using the exponential-decay
   fit and its residual-based deviation flags (see
   :mod:`analysis.curve_fit`): runs of consecutive "above the fitted
   curve" points become historical plateau zones.

This module is UI-agnostic — no FastAPI or DB imports. It never raises:
every failure mode (too little data, a non-converging curve fit) degrades
to a populated ``reason``/``warning`` string, mirroring the style of
:mod:`analysis.goal`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd

from analysis.curve_fit import AnalysisConfig, detect_deviations, fit_exponential_decay
from analysis.smoothing import compute_rolling_mean
from analysis.trend import TrendConfig, fit_recent_trend

if TYPE_CHECKING:
    import datetime

# Plateau state values (kept as plain strings rather than a TS-style
# const-object — this is Python; ``Literal["plateau", "losing", "gaining"]``
# in the Pydantic schema is the source of truth for the allowed values).
STATE_PLATEAU = "plateau"
STATE_LOSING = "losing"
STATE_GAINING = "gaining"


@dataclass(frozen=True)
class PlateauConfig:
    """Configuration for plateau detection.

    Attributes:
        trend_window_days: Length of the recent window used to evaluate the
            *current* trend (passed to ``fit_recent_trend`` as
            ``TrendConfig.window_days``). Deliberately shorter than the
            goal-projection window (56 days, see ``analysis.goal``): a
            plateau is a short-term signal, and an 8-week window would
            smear a genuine 3-week stall together with older movement.
        min_window_span_days: Minimum calendar-day span the data must
            actually cover within that window for a "plateau" verdict to be
            trusted (the spec's "at least 14 days of data"). Guards against
            a couple of points clustered in a few days producing a
            spuriously flat slope. When this isn't met, the state falls
            back to "losing"/"gaining" from the slope's sign alone.
        plateau_slope_threshold: Absolute slope (kg/week) below which the
            recent trend is considered flat.
        plateau_band_pct: Half-width of the "still on the current plateau"
            band, as a fraction of the current smoothed level (``0.005`` =
            +/-0.5%). Used only to walk backward and estimate how far the
            current plateau extends.
        smoothing_window: Rolling-mean window (see
            ``analysis.smoothing.compute_rolling_mean``) used to de-noise
            the level the plateau band is centred on.
        min_points_for_status: Minimum total measurements required to
            attempt any computation at all.
    """

    trend_window_days: int = 21
    min_window_span_days: int = 14
    plateau_slope_threshold: float = 0.1
    plateau_band_pct: float = 0.005
    smoothing_window: int = 5
    min_points_for_status: int = 3


def _empty_status(reason: str) -> dict:
    """Fully degraded status — used when there isn't enough data to say anything.

    Args:
        reason: Human-readable explanation, surfaced directly to the UI.

    Returns:
        A dict matching the full ``compute_plateau_status`` shape with all
        computed fields null/empty.
    """
    return {
        "has_data": False,
        "state": None,
        "in_plateau": False,
        "trend_per_week": None,
        "since_date": None,
        "duration_days": None,
        "history": [],
        "avg_duration_days": None,
        "history_available": False,
        "reason": reason,
        "warning": "",
    }


def _describe_state(
    state: str | None, trend_per_week: float | None, duration_days: int | None
) -> str:
    """Build the human-readable ``reason`` sentence for the current state.

    Args:
        state: One of ``"plateau"``, ``"losing"``, ``"gaining"``, or ``None``.
        trend_per_week: Current trend in kg/week, or ``None``.
        duration_days: Days the current plateau has lasted, or ``None``.

    Returns:
        A descriptive sentence (never empty).
    """
    if state is None or trend_per_week is None:
        return "Not enough recent data to determine your current trend."
    if state == STATE_PLATEAU:
        days = duration_days if duration_days is not None else 0
        return (
            f"Your weight has held steady for about {days} day(s) "
            f"(recent trend: {trend_per_week:+.2f} kg/week)."
        )
    if state == STATE_LOSING:
        return f"You're losing weight at about {abs(trend_per_week):.2f} kg/week."
    return f"You're gaining weight at about {abs(trend_per_week):.2f} kg/week."


def _estimate_plateau_start(
    df: pd.DataFrame, config: PlateauConfig
) -> tuple[datetime.date, int]:
    """Estimate how far back the current plateau extends.

    Design choice (documented per spec): walk backward from the latest
    measurement over the *smoothed* weight (rolling mean, to ignore
    day-to-day noise) while it stays within +/-``plateau_band_pct`` of the
    current smoothed level. The first violation (or a non-finite smoothed
    value, which only occurs at the very edge of the series) stops the
    walk. This is a simple, easy-to-explain heuristic — it does not try to
    fit a change-point model.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted ascending
            (>= 2 rows).
        config: Plateau configuration.

    Returns:
        A tuple ``(since_date, duration_days)``.
    """
    dates = pd.to_datetime(df["date"]).reset_index(drop=True)
    smoothed = compute_rolling_mean(df, window=config.smoothing_window).reset_index(
        drop=True
    )

    last_idx = len(df) - 1
    last_level = float(smoothed.iloc[last_idx])
    level = last_level if math.isfinite(last_level) else float(df["weight"].iloc[last_idx])
    lower = level * (1.0 - config.plateau_band_pct)
    upper = level * (1.0 + config.plateau_band_pct)

    since_idx = last_idx
    for i in range(last_idx - 1, -1, -1):
        value = float(smoothed.iloc[i])
        if not math.isfinite(value) or value < lower or value > upper:
            break
        since_idx = i

    since_date = dates.iloc[since_idx].date()
    last_date = dates.iloc[last_idx].date()
    return since_date, (last_date - since_date).days


def _current_state(df: pd.DataFrame, config: PlateauConfig) -> dict:
    """Compute the current plateau/losing/gaining state.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns (>= 1 row).
        config: Plateau configuration.

    Returns:
        Dict with keys ``has_data``, ``state``, ``in_plateau``,
        ``trend_per_week``, ``since_date``, ``duration_days``, ``reason``.
    """
    trend_config = TrendConfig(window_days=config.trend_window_days)
    fit = fit_recent_trend(df, trend_config)
    if not fit.success or fit.last_date is None:
        return {
            "has_data": True,
            "state": None,
            "in_plateau": False,
            "trend_per_week": None,
            "since_date": None,
            "duration_days": None,
            "reason": _describe_state(None, None, None),
        }

    trend_per_week = fit.slope_per_day * 7.0

    # Re-derive the recent window's actual date span independently of the
    # trend fit's internal fallback logic, so a spuriously flat slope from
    # a handful of clustered points doesn't get reported as a plateau.
    dates = pd.to_datetime(df["date"])
    cutoff = dates.iloc[-1] - pd.Timedelta(days=config.trend_window_days)
    window_dates = dates[dates >= cutoff]
    window_span_days = (
        int((window_dates.max() - window_dates.min()).days)
        if len(window_dates) >= 2
        else 0
    )

    is_flat = abs(trend_per_week) < config.plateau_slope_threshold
    in_plateau = is_flat and window_span_days >= config.min_window_span_days

    if in_plateau:
        state = STATE_PLATEAU
    elif trend_per_week < 0:
        state = STATE_LOSING
    else:
        state = STATE_GAINING

    since_date: datetime.date | None = None
    duration_days: int | None = None
    if in_plateau:
        since_date, duration_days = _estimate_plateau_start(df, config)

    return {
        "has_data": True,
        "state": state,
        "in_plateau": in_plateau,
        "trend_per_week": trend_per_week,
        "since_date": since_date,
        "duration_days": duration_days,
        "reason": _describe_state(state, trend_per_week, duration_days),
    }


def _group_plateau_zones(df: pd.DataFrame, flags: pd.Series) -> list[dict]:
    """Merge consecutive flagged rows into contiguous plateau zones.

    Single flagged measurements (duration 0) are dropped: one point above
    the fitted curve is noise, not a multi-day plateau period — the
    caller filters those out.

    Args:
        df: DataFrame with a ``date`` column (rows align with *flags*).
        flags: Boolean series, same length as *df* (``detect_deviations``'s
            ``plateau`` column).

    Returns:
        A list of ``{"start", "end", "duration_days"}`` dicts, in date order.
    """
    dates = pd.to_datetime(df["date"]).reset_index(drop=True)
    flags = flags.reset_index(drop=True)

    zones: list[dict] = []
    start_idx: int | None = None
    for i, flagged in enumerate(flags):
        if flagged and start_idx is None:
            start_idx = i
        elif not flagged and start_idx is not None:
            zones.append(_zone_dict(dates, start_idx, i - 1))
            start_idx = None
    if start_idx is not None:
        zones.append(_zone_dict(dates, start_idx, len(flags) - 1))
    return zones


def _zone_dict(dates: pd.Series, start_idx: int, end_idx: int) -> dict:
    """Build one zone dict from a contiguous index range.

    Args:
        dates: Series of Timestamps, aligned by position with the flags.
        start_idx: First flagged index (inclusive).
        end_idx: Last flagged index (inclusive).

    Returns:
        ``{"start": date, "end": date, "duration_days": int}``.
    """
    start = dates.iloc[start_idx].date()
    end = dates.iloc[end_idx].date()
    return {"start": start, "end": end, "duration_days": (end - start).days}


def _history(df: pd.DataFrame) -> dict:
    """Compute past plateau zones from the exponential-decay fit residuals.

    Degrades gracefully: when the fit does not converge, returns an empty
    history with a warning rather than raising.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns (>= 1 row).

    Returns:
        Dict with keys ``history``, ``avg_duration_days``,
        ``history_available``, ``warning``.
    """
    fit_result = fit_exponential_decay(df, AnalysisConfig())
    if not fit_result.success:
        return {
            "history": [],
            "avg_duration_days": None,
            "history_available": False,
            "warning": (
                "Could not fit a decay curve to your history, so past "
                "plateau periods are unavailable."
            ),
        }

    deviations = detect_deviations(df, fit_result)
    zones = _group_plateau_zones(df, deviations["plateau"])
    # Drop single-point zones (duration 0) — see _group_plateau_zones.
    zones = [zone for zone in zones if zone["duration_days"] > 0]

    avg_duration_days = (
        sum(zone["duration_days"] for zone in zones) / len(zones) if zones else None
    )

    return {
        "history": zones,
        "avg_duration_days": avg_duration_days,
        "history_available": True,
        "warning": "",
    }


def compute_plateau_status(df: pd.DataFrame, config: PlateauConfig | None = None) -> dict:
    """Compute the current plateau/losing/gaining status and past plateau history.

    Never raises — every failure mode (too little data, a non-converging
    curve fit) degrades to a populated ``reason``/``warning`` string.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted by date
            ascending.
        config: Plateau configuration. Defaults to ``PlateauConfig()``.

    Returns:
        A dict with keys:

        - ``has_data``: Whether there was enough data to compute a status.
        - ``state``: ``"plateau"``, ``"losing"``, ``"gaining"``, or ``None``.
        - ``in_plateau``: Whether the current state is a plateau.
        - ``trend_per_week``: Current recency-weighted trend (kg/week), or
          ``None``.
        - ``since_date``: Start date of the current plateau, or ``None``
          when not currently on one.
        - ``duration_days``: Length of the current plateau in days, or
          ``None``.
        - ``history``: List of past plateau zones (``{"start", "end",
          "duration_days"}``), possibly empty.
        - ``avg_duration_days``: Mean duration of past plateau zones, or
          ``None`` when there are none.
        - ``history_available``: Whether the exponential fit needed to
          derive ``history`` succeeded.
        - ``reason``: Human-readable explanation of the current state.
        - ``warning``: Non-fatal diagnostic about the history computation
          (empty when ``history_available`` is ``True`` or there is no
          data at all).
    """
    if config is None:
        config = PlateauConfig()

    if df.empty or len(df) < config.min_points_for_status:
        return _empty_status(
            reason=(
                f"Add more measurements to detect a plateau "
                f"(need at least {config.min_points_for_status})."
            )
        )

    return {**_current_state(df, config), **_history(df)}
