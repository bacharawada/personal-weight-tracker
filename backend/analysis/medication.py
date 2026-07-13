"""Medication-impact analysis — trend comparison around a dose event.

This module answers: *did my weight trajectory change after I started (or
changed the dose of) a medication?* For a given event date it fits a robust
Theil--Sen slope over the window of measurements **before** the event and a
second slope over the window **after** it, then reports both in kg/week.

It also derives the set of *dose-change events* from a user's dose journal:
the first dose of each molecule, plus any later dose whose amount differs
from the previous one for the same molecule.

The module is UI-agnostic — no FastAPI or DB imports. It reuses
``analysis.trend`` for the underlying robust slope estimate.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd

from analysis.trend import TrendConfig, fit_recent_trend

if TYPE_CHECKING:
    import datetime
    from collections.abc import Iterable, Mapping

# Minimum measurements required on one side of the event to estimate a slope.
MIN_POINTS_PER_SIDE: int = 3

# Days per week — slopes are reported per week for readability.
_DAYS_PER_WEEK: float = 7.0

# A tolerance used when comparing recorded doses for equality.
_DOSE_EPS: float = 1e-9


@dataclass(frozen=True)
class DoseChange:
    """A single dose-change event derived from the dose journal.

    Attributes:
        date: The date the (new) dose was recorded.
        medication: The molecule name.
        dose_mg: The dose in milligrams at this event (``None`` if unrecorded).
        previous_dose_mg: The dose for the same molecule immediately before
            this event, or ``None`` when this is the molecule's first dose.
        is_first: ``True`` when this is the first recorded dose of the molecule.
    """

    date: datetime.date
    medication: str
    dose_mg: float | None
    previous_dose_mg: float | None
    is_first: bool


@dataclass(frozen=True)
class TrendComparison:
    """Result of comparing the weight trend before vs. after an event.

    Slopes are in kg/week and negative when losing weight. A slope is
    ``None`` when its side of the window had too few measurements to fit.

    Attributes:
        slope_before_per_week: Robust slope over the window before the event.
        slope_after_per_week: Robust slope over the window after the event.
        n_before: Measurements available in the before window.
        n_after: Measurements available in the after window.
        delta_per_week: ``slope_after - slope_before`` when both are available,
            else ``None``. A negative value means loss accelerated after the
            event.
        window_days: The half-window length used on each side.
        reason: Empty on full success; otherwise explains what degraded.
    """

    slope_before_per_week: float | None
    slope_after_per_week: float | None
    n_before: int
    n_after: int
    delta_per_week: float | None
    window_days: int
    reason: str


def _doses_equal(a: float | None, b: float | None) -> bool:
    """Return whether two recorded doses are the same (``None``-aware)."""
    if a is None or b is None:
        return a is None and b is None
    return abs(a - b) < _DOSE_EPS


def detect_dose_changes(
    doses: Iterable[Mapping[str, object]],
) -> list[DoseChange]:
    """Derive dose-change events from a medication-dose journal.

    A change event is the first recorded dose of a molecule, or any later
    dose whose ``dose_mg`` differs from the previous dose of the *same*
    molecule. Molecule names are matched case-insensitively (after trimming)
    so ``"Semaglutide"`` and ``"semaglutide"`` are treated as one molecule.

    Args:
        doses: An iterable of mappings, each with ``date``, ``medication`` and
            ``dose_mg`` keys (extra keys are ignored). Order does not matter.

    Returns:
        The change events sorted by date ascending, then by molecule name.
    """
    rows = list(doses)
    # Sort by date so "previous dose" is well defined per molecule.
    rows.sort(key=lambda d: (d["date"], str(d.get("medication", ""))))

    last_dose_by_med: dict[str, float | None] = {}
    seen_meds: set[str] = set()
    changes: list[DoseChange] = []

    for row in rows:
        medication = str(row["medication"])
        key = medication.strip().lower()
        dose_mg = row.get("dose_mg")
        dose_value: float | None = None if dose_mg is None else float(dose_mg)

        if key not in seen_meds:
            seen_meds.add(key)
            last_dose_by_med[key] = dose_value
            changes.append(
                DoseChange(
                    date=row["date"],  # type: ignore[arg-type]
                    medication=medication,
                    dose_mg=dose_value,
                    previous_dose_mg=None,
                    is_first=True,
                )
            )
            continue

        previous = last_dose_by_med[key]
        if not _doses_equal(previous, dose_value):
            changes.append(
                DoseChange(
                    date=row["date"],  # type: ignore[arg-type]
                    medication=medication,
                    dose_mg=dose_value,
                    previous_dose_mg=previous,
                    is_first=False,
                )
            )
        last_dose_by_med[key] = dose_value

    return changes


def _fit_slope_per_week(window: pd.DataFrame) -> float | None:
    """Fit a robust slope (kg/week) over *window*, or ``None`` if it can't.

    Reuses ``analysis.trend.fit_recent_trend`` with a very large recent
    window so the whole slice is used, yielding a plain Theil--Sen slope.

    Args:
        window: DataFrame with ``date`` and ``weight`` columns.

    Returns:
        The slope in kg/week, or ``None`` when there are too few points /
        distinct days to fit.
    """
    if len(window) < MIN_POINTS_PER_SIDE:
        return None
    # A window far wider than any realistic slice (which spans at most a few
    # hundred days) so the whole slice is treated as "recent" and used in full;
    # kept well under pandas' Timedelta bounds.
    config = TrendConfig(
        window_days=36_500,
        min_window_points=1,
        min_points=MIN_POINTS_PER_SIDE,
    )
    fit = fit_recent_trend(window, config)
    if not fit.success:
        return None
    return fit.slope_per_day * _DAYS_PER_WEEK


def compare_trend_around(
    df: pd.DataFrame,
    event_date: datetime.date,
    window_days: int = 28,
) -> TrendComparison:
    """Compare the weight trend in the windows before and after *event_date*.

    Measurements on *event_date* itself are shared by both windows (the pivot).

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        event_date: The dose-event date the comparison pivots on.
        window_days: Half-window length in days for each side. Defaults to 28
            (four weeks).

    Returns:
        A ``TrendComparison``. Check ``reason`` / the ``None`` slopes for
        graceful-degradation handling.
    """
    if df.empty:
        return TrendComparison(
            slope_before_per_week=None,
            slope_after_per_week=None,
            n_before=0,
            n_after=0,
            delta_per_week=None,
            window_days=window_days,
            reason="No measurements to analyse.",
        )

    dates = pd.to_datetime(df["date"])
    event_ts = pd.Timestamp(event_date)
    before_lo = event_ts - pd.Timedelta(days=window_days)
    after_hi = event_ts + pd.Timedelta(days=window_days)

    before = df[(dates >= before_lo) & (dates <= event_ts)]
    after = df[(dates >= event_ts) & (dates <= after_hi)]

    n_before = int(len(before))
    n_after = int(len(after))

    slope_before = _fit_slope_per_week(before)
    slope_after = _fit_slope_per_week(after)

    if slope_before is not None and slope_after is not None:
        delta = slope_after - slope_before
        reason = ""
    else:
        delta = None
        missing: list[str] = []
        if slope_before is None:
            missing.append(f"before ({n_before} point(s))")
        if slope_after is None:
            missing.append(f"after ({n_after} point(s))")
        reason = (
            "Not enough measurements to estimate the trend "
            + " and ".join(missing)
            + f" within {window_days} days of the dose."
        )

    return TrendComparison(
        slope_before_per_week=slope_before,
        slope_after_per_week=slope_after,
        n_before=n_before,
        n_after=n_after,
        delta_per_week=delta,
        window_days=window_days,
        reason=reason,
    )
