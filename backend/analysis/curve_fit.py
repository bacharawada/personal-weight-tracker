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
        fit_bounds: Lower/upper bounds for ``(a, b, c)`` passed to
            ``curve_fit``. Bounding the fit keeps it physically plausible
            (positive amplitude, positive decay rate, a sane asymptote) and
            switches the solver to Trust Region Reflective.
        recency_halflife_days: Half-life (days) for recency weighting. Points
            this many days older than the latest get half the influence on
            the fit. ``None`` disables recency weighting (equal weights).
    """

    smoothing_window: int = 5
    fit_p0: tuple[float, float, float] = (30.0, 0.003, 150.0)
    fit_maxfev: int = 8000
    deviation_threshold: float = 0.5
    fit_bounds: tuple[tuple[float, float, float], tuple[float, float, float]] = (
        (0.0, 1e-6, 30.0),
        (500.0, 0.5, 300.0),
    )
    recency_halflife_days: float | None = 60.0


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
        param_std: One-sigma standard error on each parameter
            (``sqrt(diag(pcov))``); empty when the covariance is unusable.
        pcov: Parameter covariance matrix from ``curve_fit``; empty when
            non-finite (e.g. an under-determined fit).
        warning: Non-fatal diagnostic — set when the fit succeeds but is
            implausible (e.g. no real decay), empty otherwise.
    """

    params: tuple[float, float, float] = (0.0, 0.0, 0.0)
    x_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    residuals: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    std_residuals: float = 0.0
    success: bool = False
    error_message: str = ""
    param_std: tuple[float, float, float] | None = None
    pcov: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    warning: str = ""


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

    # Recency weighting: older points get a larger sigma (less influence) so
    # the fit tracks the current trajectory rather than ancient history.
    # curve_fit minimises sum(((y - f) / sigma)**2); sigma = 0.5**(-age/2H)
    # is the inverse-sqrt of a half-life weight, age measured from the latest
    # measurement.
    sigma = None
    if config.recency_halflife_days is not None and config.recency_halflife_days > 0:
        age = days.max() - days
        sigma = np.power(0.5, -age / (2.0 * config.recency_halflife_days))

    try:
        # Bounds switch curve_fit to Trust Region Reflective (TRF), which
        # keeps the fit physically plausible; with bounds the solver is no
        # longer Levenberg-Marquardt.
        popt, pcov = curve_fit(
            exp_decay,
            days,
            weights,
            p0=list(config.fit_p0),
            bounds=config.fit_bounds,
            sigma=sigma,
            absolute_sigma=False,
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

    # Capture the covariance and per-parameter standard errors when usable.
    pcov = np.asarray(pcov, dtype=float)
    if pcov.shape == (3, 3) and np.all(np.isfinite(pcov)):
        result.pcov = pcov
        result.param_std = tuple(np.sqrt(np.diag(pcov)).astype(float))

    # Plausibility: an asymptote at or above the latest weight means the model
    # found no real decay left. Keep success=True (degrade gracefully) but flag
    # it so the UI can warn instead of projecting a flat or rising "decay".
    latest_weight = float(weights[-1])
    if result.params[2] >= latest_weight:
        result.warning = (
            "Exponential model shows no further decay from the current weight; "
            "its projection is unreliable."
        )

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


def exp_decay_band(
    x: NDArray[np.floating],
    popt: tuple[float, float, float],
    pcov: NDArray[np.floating],
    n_samples: int = 200,
    confidence: float = 0.95,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """Monte-Carlo confidence band for the exponential-decay curve.

    Samples parameter sets from ``multivariate_normal(popt, pcov)``, evaluates
    the model at each *x*, and returns the per-*x* percentile envelope. The
    band reflects parameter uncertainty propagated through the (non-linear)
    model — a more honest projection than a single line.

    Args:
        x: Day-offset values at which to evaluate the band.
        popt: Fitted parameters ``(a, b, c)``.
        pcov: Parameter covariance matrix (3x3). Must be finite.
        n_samples: Number of Monte-Carlo parameter draws.
        confidence: Central confidence level (0–1); the band spans the
            symmetric percentile interval, e.g. 0.95 → [2.5%, 97.5%].

    Returns:
        A tuple ``(y_low, y_high)`` of the same length as *x*. Both arrays are
        empty when *pcov* is unusable (non-finite or wrong shape).
    """
    pcov = np.asarray(pcov, dtype=float)
    x = np.asarray(x, dtype=float)
    if pcov.shape != (3, 3) or not np.all(np.isfinite(pcov)) or x.size == 0:
        return np.array([]), np.array([])

    # Seeded generator so the band is deterministic across identical requests.
    rng = np.random.default_rng(0)
    try:
        samples = rng.multivariate_normal(np.asarray(popt, dtype=float), pcov, size=n_samples)
    except (ValueError, np.linalg.LinAlgError):
        return np.array([]), np.array([])

    # curves[i] is the model evaluated for parameter draw i: shape (n_samples, len(x)).
    curves = samples[:, 0:1] * np.exp(-samples[:, 1:2] * x[None, :]) + samples[:, 2:3]
    lower_pct = (1.0 - confidence) / 2.0 * 100.0
    upper_pct = (1.0 + confidence) / 2.0 * 100.0
    y_low = np.percentile(curves, lower_pct, axis=0)
    y_high = np.percentile(curves, upper_pct, axis=0)
    return y_low, y_high


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
