"""Summary statistics (KPIs) for the weight tracker stats panel.

This module is UI-agnostic — no Dash imports.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class SummaryStats:
    """KPI summary for the stats panel.

    Attributes:
        total_loss_kg: First weight minus latest weight.
        avg_loss_per_week: Mean weekly loss over the entire period.
        current_trend: Rolling-mean slope over the last 4 weeks (kg/week).
        days_tracked: Elapsed calendar days from first to last measurement (inclusive).
    """

    total_loss_kg: float
    avg_loss_per_week: float
    current_trend: float
    days_tracked: int


def compute_summary_stats(df: pd.DataFrame) -> SummaryStats:
    """Compute high-level KPIs from the measurement data.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns, sorted by
            date ascending.

    Returns:
        A ``SummaryStats`` instance.
    """
    if df.empty:
        return SummaryStats(
            total_loss_kg=0.0,
            avg_loss_per_week=0.0,
            current_trend=0.0,
            days_tracked=0,
        )

    dates = pd.to_datetime(df["date"])
    weights = df["weight"].values.astype(float)

    total_loss = float(weights[0] - weights[-1])
    total_days = (dates.iloc[-1] - dates.iloc[0]).days
    avg_per_week = total_loss / (total_days / 7.0) if total_days > 0 else 0.0

    # Current trend: slope of the rolling mean over the last 4 weeks
    four_weeks_ago = dates.iloc[-1] - pd.Timedelta(weeks=4)
    recent = df[dates >= four_weeks_ago]
    if len(recent) >= 2:
        recent_dates = pd.to_datetime(recent["date"])
        recent_days = (recent_dates - recent_dates.iloc[0]).dt.days.astype(float)
        recent_weights = recent["weight"].values.astype(float)
        if recent_days.iloc[-1] > 0:
            # Simple slope: (last - first) / days * 7
            current_trend = float(
                (recent_weights[-1] - recent_weights[0])
                / recent_days.iloc[-1]
                * 7.0
            )
        else:
            current_trend = 0.0
    else:
        current_trend = 0.0

    return SummaryStats(
        total_loss_kg=total_loss,
        avg_loss_per_week=avg_per_week,
        current_trend=current_trend,
        # NOTE: days_tracked is the elapsed calendar days between the
        # first and last measurement, not the count of measurements.
        # Use (last - first).days + 1 to include both endpoints.
        days_tracked=int(total_days) + 1,
    )
