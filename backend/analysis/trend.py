"""Recency-weighted robust linear trend for goal projection.

Where ``curve_fit.py`` fits a global exponential-decay curve (a good
*descriptive* overlay), this module answers a different question: *at my
**current** rate, when do I reach my goal?*

It fits a robust linear trend (Theil–Sen) over a recent window of the
data only, so old history does not anchor the projection. Theil–Sen is
resistant to day-to-day outliers and returns a confidence interval on the
slope, which we turn into an optimistic/pessimistic date range rather than
a single overconfident point estimate.

This module is UI-agnostic — no FastAPI or DB imports.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd
from scipy.stats import theilslopes

if TYPE_CHECKING:
    import datetime

    from numpy.typing import NDArray


@dataclass(frozen=True)
class TrendConfig:
    """Configuration for the recency-weighted trend fit.

    Attributes:
        window_days: Length of the recent window the trend is fit over.
            Defaults to 56 (eight weeks).
        min_window_points: Minimum points required inside the window. When
            the window holds fewer, the fit falls back to all available
            data.
        min_points: Absolute minimum points needed to fit a trend at all.
        max_horizon_days: Projections further out than this are reported as
            "too far to project" — a straight line has no asymptote, so it
            would otherwise claim any low weight is reachable given enough
            time.
        confidence: Confidence level for the slope interval (0–1).
    """

    window_days: int = 56
    min_window_points: int = 4
    min_points: int = 3
    max_horizon_days: int = 730
    confidence: float = 0.95


@dataclass(frozen=True)
class TrendFit:
    """Result of a robust linear trend fit over the recent window.

    Attributes:
        success: Whether a usable trend could be fit.
        slope_per_day: Robust slope in kg/day (negative when losing).
        slope_per_day_low: Lower (more negative) slope at the confidence
            bound — the *faster* loss case.
        slope_per_day_high: Upper (less negative) slope at the confidence
            bound — the *slower* loss case; may be >= 0.
        level_at_last: Fitted weight on the trend line at the most recent
            measurement date (a de-noised "current weight").
        last_date: Date of the most recent measurement used.
        n_points: Number of points the trend was fit over.
        error_message: Why the fit failed (empty on success).
    """

    success: bool = False
    slope_per_day: float = 0.0
    slope_per_day_low: float = 0.0
    slope_per_day_high: float = 0.0
    level_at_last: float = 0.0
    last_date: datetime.date | None = None
    n_points: int = 0
    error_message: str = ""


def fit_recent_trend(
    df: pd.DataFrame,
    config: TrendConfig | None = None,
) -> TrendFit:
    """Fit a robust linear trend over the most recent window of the data.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted by date
            ascending.
        config: Trend configuration. Defaults to ``TrendConfig()``.

    Returns:
        A ``TrendFit``. Check ``success`` before using the slope.
    """
    if config is None:
        config = TrendConfig()

    if df.empty or len(df) < config.min_points:
        return TrendFit(error_message="Not enough data points for a trend (need >= 3).")

    dates = pd.to_datetime(df["date"])
    last_ts = dates.iloc[-1]

    # Restrict to the recent window; fall back to all data when the window
    # is too sparse to fit a meaningful trend.
    cutoff = last_ts - pd.Timedelta(days=config.window_days)
    window_mask = dates >= cutoff
    if int(window_mask.sum()) >= config.min_window_points:
        window = df[window_mask]
        window_dates = dates[window_mask]
    else:
        window = df
        window_dates = dates

    days = (window_dates - window_dates.iloc[0]).dt.days.astype(float).to_numpy()
    weights = window["weight"].to_numpy(dtype=float)

    if len(set(days.tolist())) < 2:
        return TrendFit(error_message="All measurements fall on the same day.")

    try:
        result = theilslopes(weights, days, alpha=config.confidence)
    except (ValueError, ZeroDivisionError) as exc:
        return TrendFit(error_message=f"Trend fit failed: {exc}")

    slope = float(result[0])
    intercept = float(result[1])
    slope_low = float(result[2])
    slope_high = float(result[3])

    if not all(math.isfinite(v) for v in (slope, intercept, slope_low, slope_high)):
        return TrendFit(error_message="Trend fit produced non-finite parameters.")

    last_day = float(days[-1])
    level_at_last = intercept + slope * last_day

    return TrendFit(
        success=True,
        slope_per_day=slope,
        slope_per_day_low=slope_low,
        slope_per_day_high=slope_high,
        level_at_last=level_at_last,
        last_date=last_ts.date(),
        n_points=len(weights),
    )


def trend_curve(
    fit: TrendFit,
    first_date: datetime.date,
    last_date: datetime.date,
    horizon_days: int,
) -> tuple[
    NDArray[np.floating],
    NDArray[np.floating],
    NDArray[np.floating],
    NDArray[np.floating],
]:
    """Project the linear trend line and its confidence band.

    The line is anchored at ``fit.level_at_last`` on *last_date* and extended
    both back to *first_date* (the in-sample portion) and forward by
    *horizon_days*. The band uses the slow/fast slope bounds, so it has zero
    width at the anchor and fans out with distance from it.

    Args:
        fit: A successful ``TrendFit``.
        first_date: Date of the first measurement (x-origin, day offset 0).
        last_date: Date of the most recent measurement (the anchor).
        horizon_days: Days beyond *last_date* to project.

    Returns:
        A tuple ``(x, y, y_low, y_high)`` of day-offsets from *first_date* and
        the corresponding centre line and lower/upper band. All empty when the
        fit failed.
    """
    if not fit.success:
        empty = np.array([])
        return empty, empty, empty, empty

    last_off = float((pd.Timestamp(last_date) - pd.Timestamp(first_date)).days)
    horizon = max(0, horizon_days)

    # Two segments sharing the anchor point so the in-sample / extrapolation
    # split in ``build_model_curve`` is continuous at *last_off*.
    x_in = np.linspace(0.0, last_off, 200) if last_off > 0 else np.array([0.0])
    x_out = (
        np.linspace(last_off, last_off + horizon, 200)
        if horizon > 0
        else np.array([last_off])
    )
    x = np.concatenate([x_in, x_out])

    delta = x - last_off
    y = fit.level_at_last + fit.slope_per_day * delta
    y_low = fit.level_at_last + fit.slope_per_day_low * delta
    y_high = fit.level_at_last + fit.slope_per_day_high * delta
    return x, y, y_low, y_high
