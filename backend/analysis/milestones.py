"""Goal milestones — break the goal weight into equally-spaced checkpoints.

Splits the distance between the user's starting weight (their first
recorded measurement) and their goal weight into ``n`` equal checkpoints
("milestones", Happy Scale style). Each milestone is independently marked
as achieved the first time a *raw* (unsmoothed) measurement reaches it,
which lets the user see incremental wins on the way to the goal instead of
a single all-or-nothing target.

Like :mod:`analysis.goal`, this module degrades gracefully: it never
raises on bad input and returns a populated ``reason`` string describing
why milestones could not be computed (no goal, no data, goal not below
the starting weight).

This module is UI-agnostic — no FastAPI or DB imports.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    import datetime

DEFAULT_MILESTONE_COUNT = 10


def _empty(has_goal: bool, reason: str) -> dict:
    """Return a milestones projection with no computed checkpoints.

    Args:
        has_goal: Whether a goal weight is configured.
        reason: Human-readable explanation string.

    Returns:
        A dict with empty/zeroed milestone fields (see
        :func:`project_milestones` for the full key list).
    """
    return {
        "has_goal": has_goal,
        "start_weight": None,
        "goal_weight": None,
        "milestones": [],
        "current_milestone_index": 0,
        "percent_complete": 0.0,
        "next_milestone": None,
        "remaining_milestones": 0,
        "reason": reason,
    }


def _first_achieved_date(
    dates: pd.Series, weights: pd.Series, target_weight: float
) -> datetime.date | None:
    """Find the first date a raw weight reached *target_weight* or below.

    Args:
        dates: Ascending series of measurement dates (datetime64).
        weights: Raw weight values aligned with *dates*.
        target_weight: The milestone weight to test against (kg).

    Returns:
        The earliest ``date`` where ``weight <= target_weight``, or
        ``None`` if the milestone was never reached.
    """
    hits = weights <= target_weight
    if not hits.any():
        return None
    first_index = hits.idxmax()
    return dates.loc[first_index].date()


def project_milestones(
    df: pd.DataFrame,
    goal_weight: float | None,
    n: int = DEFAULT_MILESTONE_COUNT,
) -> dict:
    """Split the goal into *n* equally-spaced milestones and track progress.

    The starting weight is the first recorded measurement. Milestone *i*
    (1-indexed) targets ``start_weight - (start_weight - goal_weight) * i / n``,
    so milestone *n* always equals the goal weight exactly. A milestone is
    ``achieved`` the first time a raw measurement is at or below its target,
    independently of the other milestones (a big drop can achieve several
    milestones on the same date).

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted ascending.
        goal_weight: Target weight in kilograms, or ``None`` if unset.
        n: Number of milestones to generate. Defaults to 10.

    Returns:
        A dict with the following keys:

        * ``has_goal``: Whether a goal weight is configured.
        * ``start_weight``: First recorded weight (kg), or ``None``.
        * ``goal_weight``: Echoed target weight (kg), or ``None``.
        * ``milestones``: List of ``n`` dicts, each with ``index`` (1-based),
          ``target_weight`` (kg), ``achieved`` (bool), and ``achieved_date``
          (the first date reached, or ``None``).
        * ``current_milestone_index``: Count of achieved milestones (0..n) —
          the "X" in an "X/n" progress counter.
        * ``percent_complete``: Weight-based progress from start to goal,
          clamped to ``[0, 100]``.
        * ``next_milestone``: Dict with ``index``, ``target_weight``, and
          ``kg_remaining`` for the first unachieved milestone, or ``None``
          when every milestone is achieved.
        * ``remaining_milestones``: Count of unachieved milestones.
        * ``reason``: Human-readable summary of the current state.

        Always returns a value — never raises.
    """
    if goal_weight is None:
        return _empty(has_goal=False, reason="No goal weight set.")

    if df.empty:
        return _empty(has_goal=True, reason="Add measurements to track milestones.")

    start_weight = float(df["weight"].values[0])

    if goal_weight >= start_weight:
        return _empty(
            has_goal=True,
            reason=(
                f"Goal weight ({goal_weight:.1f} kg) must be below your starting "
                f"weight ({start_weight:.1f} kg) to track milestones."
            ),
        )

    dates = pd.to_datetime(df["date"])
    weights = df["weight"].astype(float)
    latest_weight = float(weights.iloc[-1])
    total_to_lose = start_weight - goal_weight

    milestones: list[dict] = []
    achieved_count = 0
    for i in range(1, n + 1):
        target_weight = start_weight - total_to_lose * i / n
        achieved_date = _first_achieved_date(dates, weights, target_weight)
        achieved = achieved_date is not None
        if achieved:
            achieved_count += 1
        milestones.append(
            {
                "index": i,
                "target_weight": round(target_weight, 2),
                "achieved": achieved,
                "achieved_date": achieved_date,
            }
        )

    next_milestone: dict | None = None
    for milestone in milestones:
        if not milestone["achieved"]:
            next_milestone = {
                "index": milestone["index"],
                "target_weight": milestone["target_weight"],
                "kg_remaining": round(
                    max(0.0, latest_weight - milestone["target_weight"]), 2
                ),
            }
            break

    percent_complete = (start_weight - latest_weight) / total_to_lose * 100.0
    percent_complete = max(0.0, min(100.0, percent_complete))

    if next_milestone is None:
        reason = f"All {n} milestones reached — goal achieved!"
    else:
        reason = (
            f"{achieved_count}/{n} milestones reached — "
            f"{next_milestone['kg_remaining']:.1f} kg to milestone "
            f"{next_milestone['index']}."
        )

    return {
        "has_goal": True,
        "start_weight": round(start_weight, 2),
        "goal_weight": round(goal_weight, 2),
        "milestones": milestones,
        "current_milestone_index": achieved_count,
        "percent_complete": round(percent_complete, 1),
        "next_milestone": next_milestone,
        "remaining_milestones": n - achieved_count,
        "reason": reason,
    }
