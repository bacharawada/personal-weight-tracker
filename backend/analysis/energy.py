"""Estimated energy balance from the weight trend.

This is the first brick of an adaptive TDEE estimate (in the spirit of
MacroFactor): rather than trusting logged calories, it infers the daily
energy balance *from the body-weight trend itself*.

The physics is a single well-known approximation: one kilogram of body-mass
change corresponds to roughly ``ENERGY_DENSITY_KCAL_PER_KG`` kilocalories.
Multiplying the trend slope (kg/day) by that density gives an average daily
energy balance in kcal — negative for a deficit (losing), positive for a
surplus (gaining).

Two views are exposed:

- :func:`estimate_energy_balance` — one headline number for the recent
  window, reusing the robust Theil–Sen slope from :mod:`analysis.trend`, with
  an uncertainty range taken from the slope's confidence interval.
- :func:`energy_series` — a per-point time series of the estimated daily
  balance, reusing the smoothed derivative from :mod:`analysis.derivative`.

This module is UI-agnostic — no FastAPI or DB imports. Both public functions
degrade gracefully and never raise on bad input (mirroring
:mod:`analysis.goal`): a populated ``reason`` explains why no estimate could
be produced.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

import pandas as pd

from analysis.derivative import compute_derivative
from analysis.trend import TrendConfig, fit_recent_trend

if TYPE_CHECKING:
    from analysis.trend import TrendFit

# ---------------------------------------------------------------------------
# Physiological constant
# ---------------------------------------------------------------------------

# Energy density of body-mass change, in kcal per kg. The canonical "7700 kcal
# per kg" figure derives from the energy content of adipose tissue (~9 kcal/g
# fat × ~86% fat fraction). It is an *approximation* and has real limits:
#   - Short-term weight change is dominated by water and glycogen, not fat, so
#     day-to-day swings translate to wildly overstated "energy" numbers — only
#     a multi-week trend is meaningful here.
#   - The constant assumes lost/gained mass is pure fat; in practice some lean
#     mass is involved, which lowers the effective density.
#   - It ignores metabolic adaptation (TDEE drifting as weight changes).
# It is therefore a directional estimate, not a substitute for a metabolic
# ward. Always read it alongside its uncertainty range.
ENERGY_DENSITY_KCAL_PER_KG = 7700.0


# ---------------------------------------------------------------------------
# Headline balance
# ---------------------------------------------------------------------------


def _empty(reason: str) -> dict:
    """Return an energy-balance estimate with no computed number.

    Args:
        reason: Human-readable explanation of why no estimate is available.

    Returns:
        A JSON-ready dict with ``has_data=False`` and null estimate fields.
    """
    return {
        "has_data": False,
        "balance_kcal_day": None,
        "balance_low": None,
        "balance_high": None,
        "window_days": None,
        "trend_per_week": None,
        "n_points": 0,
        "reason": reason,
    }


def estimate_energy_balance(
    df: pd.DataFrame,
    config: TrendConfig | None = None,
) -> dict:
    """Estimate the average daily energy balance from the recent weight trend.

    Reuses :func:`analysis.trend.fit_recent_trend` to obtain a robust slope in
    kg/day over the recent window, then converts it to a daily energy balance:

        ``balance_kcal_day = slope_per_day × ENERGY_DENSITY_KCAL_PER_KG``

    A negative value is a deficit (losing), a positive value a surplus. The
    slope's confidence interval yields a ``balance_low`` / ``balance_high``
    uncertainty range (both signed kcal/day, with
    ``balance_low <= balance_kcal_day <= balance_high``).

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted ascending.
        config: Trend configuration. Defaults to ``TrendConfig()``.

    Returns:
        A JSON-ready dict. Always returns a value — never raises. Check
        ``has_data`` before using the numeric fields; ``reason`` explains a
        missing estimate.
    """
    if config is None:
        config = TrendConfig()

    if df.empty:
        return _empty("Add measurements to estimate your energy balance.")

    fit: TrendFit = fit_recent_trend(df, config)
    if not fit.success:
        return _empty(
            fit.error_message
            or "Not enough data yet to estimate your energy balance."
        )

    balance = fit.slope_per_day * ENERGY_DENSITY_KCAL_PER_KG
    # slope_per_day_low is the faster-loss bound (more negative) and
    # slope_per_day_high the slower-loss bound, so multiplying by the positive
    # density preserves ordering: low <= central <= high.
    balance_low = fit.slope_per_day_low * ENERGY_DENSITY_KCAL_PER_KG
    balance_high = fit.slope_per_day_high * ENERGY_DENSITY_KCAL_PER_KG

    return {
        "has_data": True,
        "balance_kcal_day": balance,
        "balance_low": min(balance_low, balance_high),
        "balance_high": max(balance_low, balance_high),
        "window_days": fit.window_days,
        "trend_per_week": fit.slope_per_day * 7.0,
        "n_points": fit.n_points,
        "reason": "",
    }


# ---------------------------------------------------------------------------
# Per-point series
# ---------------------------------------------------------------------------


def energy_series(df: pd.DataFrame, window: int = 5) -> list[dict]:
    """Build a per-point time series of the estimated daily energy balance.

    Reuses :func:`analysis.derivative.compute_derivative` for the time-based
    rate of change (kg/week), smooths it with a ``window``-point centred
    rolling mean (``window=5`` reproduces ``compute_derivative``'s
    ``deriv_smooth`` column), and converts it to a daily energy balance:

        ``kcal_day = smoothed_rate_kg_week × ENERGY_DENSITY_KCAL_PER_KG / 7``

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted ascending.
        window: Centred rolling-mean window for the rate, in points.

    Returns:
        A list of ``{"date": date, "kcal": float}`` points (negative kcal =
        deficit). The first measurement has no defined rate and is omitted, as
        is any point whose smoothed rate is non-finite. Empty when there are
        fewer than two measurements.
    """
    if df.empty or len(df) < 2:
        return []

    deriv = compute_derivative(df)
    smoothed_rate = (
        deriv["deriv_kgweek"].rolling(window=window, center=True, min_periods=2).mean()
    )
    kcal_per_day = smoothed_rate * ENERGY_DENSITY_KCAL_PER_KG / 7.0

    dates = pd.to_datetime(deriv["date"])
    points: list[dict] = []
    for ts, value in zip(dates, kcal_per_day, strict=True):
        fvalue = float(value)
        if math.isfinite(fvalue):
            points.append({"date": ts.date(), "kcal": fvalue})
    return points
