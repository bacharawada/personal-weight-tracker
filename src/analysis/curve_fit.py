"""Exponential-decay curve fitting, extrapolation, and deviation detection.

Model: ``w(t) = a * exp(-b * t) + c``

Fit via ``scipy.optimize.curve_fit`` (Levenberg-Marquardt).  This
module is UI-agnostic — no Dash imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

if TYPE_CHECKING:
    import datetime

    from numpy.typing import NDArray


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AnalysisConfig:
    """Configuration for the analysis pipeline.

    Attributes:
        smoothing_window: Number of points for the centred rolling mean.
            Must be in the range [3, 10].
        fit_p0: Initial guesses for the exponential-decay fit parameters
            ``(a, b, c)``.
        fit_maxfev: Maximum number of function evaluations for curve_fit.
        deviation_threshold: Number of standard deviations for plateau /
            acceleration detection (0.5 by default).
    """

    smoothing_window: int = 5
    fit_p0: tuple[float, float, float] = (30.0, 0.003, 150.0)
    fit_maxfev: int = 8000
    deviation_threshold: float = 0.5


# ---------------------------------------------------------------------------
# Exponential-decay model
# ---------------------------------------------------------------------------


def exp_decay(t: NDArray[np.floating], a: float, b: float, c: float) -> NDArray[np.floating]:
    """Exponential-decay model: ``w(t) = a * exp(-b * t) + c``.

    Args:
        t: Time values (days since first measurement).
        a: Amplitude parameter.
        b: Decay-rate parameter.
        c: Asymptote parameter (predicted equilibrium weight).

    Returns:
        Modelled weight values.
    """
    return a * np.exp(-b * t) + c


# ---------------------------------------------------------------------------
# Fit result container
# ---------------------------------------------------------------------------


@dataclass
class FitResult:
    """Container for exponential-decay fit results.

    Attributes:
        params: Tuple ``(a, b, c)`` of fitted parameters.
        x_fit: Dense array of day-values for plotting the fitted curve.
        y_fit: Corresponding model values.
        residuals: Observed minus predicted at each data point.
        std_residuals: Standard deviation of the residuals.
        success: Whether the fit converged.
        error_message: Description of why the fit failed (empty on success).
    """

    params: tuple[float, float, float] = (0.0, 0.0, 0.0)
    x_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    residuals: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    std_residuals: float = 0.0
    success: bool = False
    error_message: str = ""


# ---------------------------------------------------------------------------
# Curve fit
# ---------------------------------------------------------------------------


def fit_exponential_decay(
    df: pd.DataFrame,
    config: AnalysisConfig | None = None,
) -> FitResult:
    """Fit an exponential-decay model to the weight data.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns (>= 3 rows).
        config: Analysis configuration.  Defaults to ``AnalysisConfig()``.

    Returns:
        A ``FitResult`` instance.  Check ``result.success`` before using
        the fitted parameters.
    """
    if config is None:
        config = AnalysisConfig()

    result = FitResult()

    if len(df) < 3:
        result.error_message = "Not enough data points for curve fitting (need >= 3)"
        return result

    dates = pd.to_datetime(df["date"])
    days = (dates - dates.iloc[0]).dt.days.astype(float).values
    weights = df["weight"].values.astype(float)

    try:
        # NOTE: Levenberg-Marquardt (the default in curve_fit) is well
        # suited for this smooth, monotonically-decaying signal.
        popt, _ = curve_fit(
            exp_decay,
            days,
            weights,
            p0=list(config.fit_p0),
            maxfev=config.fit_maxfev,
        )
    except (RuntimeError, ValueError, TypeError) as exc:
        result.error_message = f"Curve fit failed: {exc}"
        return result

    # Verify parameters are finite.
    if not np.all(np.isfinite(popt)):
        result.error_message = "Curve fit produced non-finite parameters"
        return result

    x_fit = np.linspace(days.min(), days.max(), 400)
    y_fit = exp_decay(x_fit, *popt)

    residuals = weights - exp_decay(days, *popt)
    std_res = float(residuals.std()) if len(residuals) > 1 else 0.0

    result.params = (float(popt[0]), float(popt[1]), float(popt[2]))
    result.x_fit = x_fit
    result.y_fit = y_fit
    result.residuals = residuals
    result.std_residuals = std_res
    result.success = True
    return result


# ---------------------------------------------------------------------------
# Extrapolation
# ---------------------------------------------------------------------------


def extrapolate_fit(
    fit_result: FitResult,
    last_date: datetime.date,
    first_date: datetime.date,
    horizon_days: int,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """Extend the exponential-decay fit beyond the last data point.

    Args:
        fit_result: A successful ``FitResult``.
        last_date: Date of the most recent measurement.
        first_date: Date of the first measurement.
        horizon_days: How many days beyond *last_date* to extrapolate.

    Returns:
        A tuple ``(x_extra_days, y_extra)`` where *x_extra_days* is
        days since *first_date* and *y_extra* is the modelled weight.
    """
    if not fit_result.success:
        return np.array([]), np.array([])

    last_day = (pd.Timestamp(last_date) - pd.Timestamp(first_date)).days
    x_extra = np.linspace(last_day, last_day + horizon_days, 200)
    y_extra = exp_decay(x_extra, *fit_result.params)
    return x_extra, y_extra


# ---------------------------------------------------------------------------
# Deviation detection
# ---------------------------------------------------------------------------


def detect_deviations(
    df: pd.DataFrame,
    fit_result: FitResult,
    config: AnalysisConfig | None = None,
) -> pd.DataFrame:
    """Flag plateau and acceleration zones based on residuals.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        fit_result: A successful ``FitResult``.
        config: Analysis configuration (uses ``deviation_threshold``).

    Returns:
        A copy of *df* with boolean columns ``plateau`` and ``accel``.
    """
    if config is None:
        config = AnalysisConfig()

    out = df.copy()
    if not fit_result.success or fit_result.std_residuals == 0:
        out["plateau"] = False
        out["accel"] = False
        return out

    threshold = config.deviation_threshold * fit_result.std_residuals
    out["plateau"] = fit_result.residuals > threshold
    out["accel"] = fit_result.residuals < -threshold
    return out
