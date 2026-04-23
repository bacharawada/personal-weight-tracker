"""Time-based derivative computation (kg/week).

Uses actual datetime differences rather than index differences so that
uneven spacing between measurements is handled correctly.  This module
is UI-agnostic — no Dash imports.
"""

from __future__ import annotations

import pandas as pd


def compute_derivative(df: pd.DataFrame) -> pd.DataFrame:
    """Compute the time-based weight-change rate in kg/week.

    Args:
        df: DataFrame with ``date`` (datetime) and ``weight`` columns.

    Returns:
        A new DataFrame with added columns:

        - ``days``: days since first measurement
        - ``deriv_kgweek``: raw derivative (kg/week)
        - ``deriv_smooth``: 5-point centred rolling mean of the derivative
    """
    out = df.copy()
    out["date"] = pd.to_datetime(out["date"])
    out["days"] = (out["date"] - out["date"].iloc[0]).dt.days.astype(float)

    dt_days = out["days"].diff()
    dw = out["weight"].diff()

    # NOTE: We multiply by 7 to convert from kg/day to kg/week, which is
    # clinically more meaningful and easier to interpret.
    out["deriv_kgweek"] = (dw / dt_days) * 7.0
    out["deriv_smooth"] = (
        out["deriv_kgweek"].rolling(window=5, center=True, min_periods=2).mean()
    )
    return out
