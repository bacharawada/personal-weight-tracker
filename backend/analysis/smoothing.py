"""Rolling-mean smoothing for weight data.

Provides a centred rolling mean with configurable window size.  This
module is UI-agnostic — no Dash imports.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pandas as pd


def compute_rolling_mean(df: pd.DataFrame, window: int = 5) -> pd.Series:
    """Compute a centred rolling mean of the ``weight`` column.

    Args:
        df: DataFrame with a ``weight`` column.
        window: Window size (must be >= 2).

    Returns:
        A ``pandas.Series`` of the same length as *df*, with ``NaN`` at
        edges where there are insufficient observations.
    """
    return df["weight"].rolling(window=window, center=True, min_periods=2).mean()
