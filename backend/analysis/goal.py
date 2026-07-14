"""Goal projection — estimate when a target weight will be reached.

Projects from the user's **current** trajectory: a robust recency-weighted
linear trend (see :mod:`analysis.trend`) is fit over the last few weeks,
and its slope is extended forward until it crosses the target weight. The
slope confidence interval yields an optimistic/pessimistic date *range*
instead of a single overconfident date.

This deliberately ignores ancient history — a global exponential fit
answers "what shape was the whole journey", which is the wrong question
for "when will I get there from here". The exponential curve remains the
descriptive chart overlay; this module owns the projection.

The projection degrades gracefully: it never raises on bad input and
returns a populated ``reason`` string describing why a date could not be
computed (no goal, not enough data, weight not trending down, goal too far
out to project reliably, etc.).
"""

from __future__ import annotations

import datetime
import math
from dataclasses import dataclass

import pandas as pd

from analysis.trend import TrendConfig, fit_recent_trend


@dataclass(frozen=True)
class GoalProjection:
    """Projection of progress toward a target weight.

    Attributes:
        has_goal: Whether a goal weight is configured.
        reachable: ``True`` if the goal is reachable on the current
            trajectory, ``False`` if the weight is not trending toward it,
            ``None`` when unknown (no goal, insufficient data, or beyond the
            reliable projection horizon).
        predicted_date: Central estimate of the date the goal is reached,
            or ``None``.
        predicted_date_optimistic: Earliest plausible date (fast-rate bound
            of the trend's confidence interval), or ``None``.
        predicted_date_pessimistic: Latest plausible date (slow-rate bound),
            or ``None`` when the slow bound stalls (no crossing).
        days_remaining: Days from the latest measurement to *predicted_date*
            (0 if already reached), or ``None``.
        already_reached: Whether the latest measurement already meets the
            goal.
        on_track: When a *target_date* is set, ``True`` if the projected
            date is on or before it; ``None`` when no target date.
        days_ahead_behind: Days ahead (negative) or behind (positive)
            relative to *target_date*; ``None`` when no target date.
        trend_per_week: Current trend in kg/week (negative when losing), or
            ``None`` when no trend could be fit.
        reason: Human-readable explanation of the projection outcome.
    """

    has_goal: bool
    reachable: bool | None
    predicted_date: datetime.date | None
    predicted_date_optimistic: datetime.date | None
    predicted_date_pessimistic: datetime.date | None
    days_remaining: int | None
    already_reached: bool
    on_track: bool | None
    days_ahead_behind: int | None
    trend_per_week: float | None
    reason: str


def _empty(has_goal: bool, reason: str) -> GoalProjection:
    """Return a projection with no computed date.

    Args:
        has_goal: Whether a goal weight is configured.
        reason: Explanation string.

    Returns:
        A ``GoalProjection`` with null date fields.
    """
    return GoalProjection(
        has_goal=has_goal,
        reachable=None,
        predicted_date=None,
        predicted_date_optimistic=None,
        predicted_date_pessimistic=None,
        days_remaining=None,
        already_reached=False,
        on_track=None,
        days_ahead_behind=None,
        trend_per_week=None,
        reason=reason,
    )


def _days_to_goal(level: float, goal: float, slope_per_day: float) -> float | None:
    """Days for a line at *level* with *slope_per_day* to reach *goal*.

    Args:
        level: Current weight on the trend line (kg).
        goal: Target weight (kg).
        slope_per_day: Trend slope in kg/day.

    Returns:
        Non-negative day count, or ``None`` when the slope does not move
        toward the goal (non-negative slope) or the result is not finite.
    """
    if slope_per_day >= 0:
        return None
    days = (goal - level) / slope_per_day
    if not math.isfinite(days):
        return None
    return max(0.0, days)


def project_goal(
    df: pd.DataFrame,
    goal_weight: float | None,
    target_date: datetime.date | None = None,
    config: TrendConfig | None = None,
) -> GoalProjection:
    """Estimate when the user will reach *goal_weight* at their current rate.

    Fits a robust linear trend over the recent window of *df* and extends it
    forward to the goal, deriving a central date plus an optimistic and a
    pessimistic bound from the slope's confidence interval.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted ascending.
        goal_weight: Target weight in kilograms, or ``None`` if unset.
        target_date: Optional date the user aims to reach the goal by.
        config: Trend configuration. Defaults to ``TrendConfig()``.

    Returns:
        A ``GoalProjection``. Always returns a value — never raises.
    """
    if config is None:
        config = TrendConfig()

    if goal_weight is None:
        return _empty(has_goal=False, reason="No goal weight set.")

    if df.empty:
        return _empty(has_goal=True, reason="Add measurements to project your goal.")

    dates = pd.to_datetime(df["date"])
    last_date = dates.iloc[-1].date()
    latest_weight = float(df["weight"].values[-1])

    # Already at or below the goal — nothing to project.
    if latest_weight <= goal_weight:
        return GoalProjection(
            has_goal=True,
            reachable=True,
            predicted_date=last_date,
            predicted_date_optimistic=last_date,
            predicted_date_pessimistic=last_date,
            days_remaining=0,
            already_reached=True,
            on_track=True if target_date is not None else None,
            days_ahead_behind=(
                (last_date - target_date).days if target_date is not None else None
            ),
            trend_per_week=None,
            reason="Goal already reached.",
        )

    fit = fit_recent_trend(df, config)
    if not fit.success or fit.last_date is None:
        return _empty(
            has_goal=True,
            reason="Not enough data yet to model a reliable projection.",
        )

    trend_per_week = fit.slope_per_day * 7.0
    weeks = config.window_days // 7

    # Weight not trending down over the recent window — no crossing.
    central_days = _days_to_goal(fit.level_at_last, goal_weight, fit.slope_per_day)
    if central_days is None:
        return GoalProjection(
            has_goal=True,
            reachable=False,
            predicted_date=None,
            predicted_date_optimistic=None,
            predicted_date_pessimistic=None,
            days_remaining=None,
            already_reached=False,
            on_track=False if target_date is not None else None,
            days_ahead_behind=None,
            trend_per_week=trend_per_week,
            reason=(
                f"Your weight isn't trending down over the last {weeks} weeks, "
                f"so {goal_weight:.1f} kg isn't projectable yet."
            ),
        )

    # A straight line has no floor: cap the horizon rather than claim any
    # arbitrarily low weight is reachable given enough time.
    if central_days > config.max_horizon_days:
        years = central_days / 365.0
        return GoalProjection(
            has_goal=True,
            reachable=None,
            predicted_date=None,
            predicted_date_optimistic=None,
            predicted_date_pessimistic=None,
            days_remaining=None,
            already_reached=False,
            on_track=None,
            days_ahead_behind=None,
            trend_per_week=trend_per_week,
            reason=(
                f"At about {abs(trend_per_week):.1f} kg/week, {goal_weight:.1f} kg is "
                f"over {years:.1f} years away — too far out to project reliably."
            ),
        )

    predicted_date = fit.last_date + datetime.timedelta(days=int(round(central_days)))
    days_remaining = max(0, (predicted_date - last_date).days)

    # Optimistic = fast-rate bound (most negative slope) → earliest date.
    # Pessimistic = slow-rate bound; may stall (None) if it never crosses.
    optimistic_days = _days_to_goal(
        fit.level_at_last, goal_weight, fit.slope_per_day_low
    )
    pessimistic_days = _days_to_goal(
        fit.level_at_last, goal_weight, fit.slope_per_day_high
    )
    predicted_date_optimistic = (
        fit.last_date + datetime.timedelta(days=int(round(optimistic_days)))
        if optimistic_days is not None and optimistic_days <= config.max_horizon_days
        else None
    )
    predicted_date_pessimistic = (
        fit.last_date + datetime.timedelta(days=int(round(pessimistic_days)))
        if pessimistic_days is not None and pessimistic_days <= config.max_horizon_days
        else None
    )

    on_track: bool | None = None
    days_ahead_behind: int | None = None
    if target_date is not None:
        days_ahead_behind = (predicted_date - target_date).days
        on_track = days_ahead_behind <= 0

    rate = f"about {abs(trend_per_week):.1f} kg/week"
    range_suffix = _range_suffix(predicted_date_optimistic, predicted_date_pessimistic)

    if target_date is not None and on_track:
        reason = (
            f"On track to reach {goal_weight:.1f} kg by {predicted_date:%d %b %Y} "
            f"at {rate}{range_suffix}."
        )
    elif target_date is not None:
        reason = (
            f"Behind target: at {rate} you'd reach {goal_weight:.1f} kg on "
            f"{predicted_date:%d %b %Y}, {days_ahead_behind} day(s) after your target."
        )
    else:
        reason = (
            f"At {rate} you're on track to reach {goal_weight:.1f} kg around "
            f"{predicted_date:%d %b %Y}{range_suffix}."
        )

    return GoalProjection(
        has_goal=True,
        reachable=True,
        predicted_date=predicted_date,
        predicted_date_optimistic=predicted_date_optimistic,
        predicted_date_pessimistic=predicted_date_pessimistic,
        days_remaining=days_remaining,
        already_reached=False,
        on_track=on_track,
        days_ahead_behind=days_ahead_behind,
        trend_per_week=trend_per_week,
        reason=reason,
    )


def _range_suffix(
    optimistic: datetime.date | None,
    pessimistic: datetime.date | None,
) -> str:
    """Build a human-readable range clause from the date bounds.

    Args:
        optimistic: Earliest plausible date, or ``None``.
        pessimistic: Latest plausible date, or ``None`` (slow bound stalls).

    Returns:
        A clause like ``" (between 05 Aug and 22 Aug 2026)"``, or an empty
        string when no meaningful range is available.
    """
    if optimistic is not None and pessimistic is not None and optimistic != pessimistic:
        return f" (between {optimistic:%d %b} and {pessimistic:%d %b %Y})"
    if optimistic is not None and pessimistic is None:
        return f" ({optimistic:%d %b %Y} at the earliest; later if your rate slows)"
    return ""
