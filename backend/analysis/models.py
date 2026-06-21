"""Unified prediction-model abstraction for chart overlays.

The charts can overlay more than one predictive model — a descriptive global
exponential-decay fit and/or a recency-weighted linear trend. Rather than have
the figure builders branch on model type, each model is reduced to a common
:class:`ModelCurve` shape: an in-sample curve, an optional forward
extrapolation, an optional uncertainty band, residuals, and presentation
metadata (legend label, asymptote line, warning).

All x-values are **day-offsets from the first measurement**, matching the
convention the chart already uses to convert back to dates
(``first_date + timedelta(days=x)``).

This module is UI-agnostic — no FastAPI or DB imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from analysis.curve_fit import (
    AnalysisConfig,
    exp_decay_band,
    extrapolate_fit,
    fit_exponential_decay,
)
from analysis.trend import fit_recent_trend, trend_curve

if TYPE_CHECKING:
    from numpy.typing import NDArray

MODEL_EXP = "exp"
MODEL_LINEAR = "linear"


@dataclass
class ModelCurve:
    """A predictive model reduced to a drawable, model-agnostic shape.

    Attributes:
        kind: Model identifier (``MODEL_EXP`` or ``MODEL_LINEAR``).
        success: Whether the model could be fit.
        x_fit: In-sample day-offsets from the first measurement.
        y_fit: In-sample model values.
        x_extra: Extrapolation day-offsets (empty when not extrapolating).
        y_extra: Extrapolation values.
        y_extra_low: Lower edge of the uncertainty band over *x_extra* (empty
            when no band was requested or it could not be computed).
        y_extra_high: Upper edge of the uncertainty band over *x_extra*.
        residuals: Observed minus predicted at each measurement.
        std_residuals: Standard deviation of the residuals.
        legend_label: Trace name shown in the chart legend.
        hline_y: Horizontal-reference y-value (exp asymptote); ``None`` when
            the model has no asymptote (linear).
        hline_label: Annotation text for the horizontal reference.
        warning: Non-fatal diagnostic to surface in the UI (empty if none).
        error_message: Why the fit failed (empty on success).
    """

    kind: str
    success: bool = False
    x_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_fit: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    x_extra: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_extra: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_extra_low: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    y_extra_high: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    residuals: NDArray[np.floating] = field(default_factory=lambda: np.array([]))
    std_residuals: float = 0.0
    legend_label: str = ""
    hline_y: float | None = None
    hline_label: str = ""
    warning: str = ""
    error_message: str = ""


def _build_exp_curve(
    df: pd.DataFrame,
    config: AnalysisConfig,
    extrapolation_days: int,
    with_band: bool,
) -> ModelCurve:
    """Build a :class:`ModelCurve` from the exponential-decay fit.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        config: Analysis configuration for the fit.
        extrapolation_days: Days beyond the last measurement to project.
        with_band: Whether to compute the Monte-Carlo uncertainty band.

    Returns:
        A populated ``ModelCurve`` (check ``success``).
    """
    fit = fit_exponential_decay(df, config)
    if not fit.success:
        return ModelCurve(kind=MODEL_EXP, success=False, error_message=fit.error_message)

    dates = pd.to_datetime(df["date"])
    first_date = dates.iloc[0].date()
    last_date = dates.iloc[-1].date()

    x_extra: NDArray[np.floating] = np.array([])
    y_extra: NDArray[np.floating] = np.array([])
    y_low: NDArray[np.floating] = np.array([])
    y_high: NDArray[np.floating] = np.array([])
    if extrapolation_days > 0:
        x_extra, y_extra = extrapolate_fit(
            fit, last_date=last_date, first_date=first_date, horizon_days=extrapolation_days
        )
        if with_band and len(x_extra) > 0:
            y_low, y_high = exp_decay_band(x_extra, fit.params, fit.pcov)

    return ModelCurve(
        kind=MODEL_EXP,
        success=True,
        x_fit=fit.x_fit,
        y_fit=fit.y_fit,
        x_extra=x_extra,
        y_extra=y_extra,
        y_extra_low=y_low,
        y_extra_high=y_high,
        residuals=fit.residuals,
        std_residuals=fit.std_residuals,
        legend_label=(
            f"Exp. decay (a={fit.params[0]:.1f}, λ={fit.params[1] * 365:.2f}/yr)"
        ),
        hline_y=fit.params[2],
        hline_label=f"Predicted equilibrium: ~{fit.params[2]:.1f} kg",
        warning=fit.warning,
    )


def _build_linear_curve(
    df: pd.DataFrame,
    extrapolation_days: int,
    with_band: bool,
) -> ModelCurve:
    """Build a :class:`ModelCurve` from the recency-weighted linear trend.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        extrapolation_days: Days beyond the last measurement to project.
        with_band: Whether to include the slope-confidence band.

    Returns:
        A populated ``ModelCurve`` (check ``success``).
    """
    fit = fit_recent_trend(df)
    if not fit.success:
        return ModelCurve(kind=MODEL_LINEAR, success=False, error_message=fit.error_message)

    dates = pd.to_datetime(df["date"])
    first_date = dates.iloc[0].date()
    last_date = dates.iloc[-1].date()
    last_off = float((pd.Timestamp(last_date) - pd.Timestamp(first_date)).days)

    x, y, y_low, y_high = trend_curve(
        fit, first_date=first_date, last_date=last_date, horizon_days=extrapolation_days
    )

    fit_mask = x <= last_off
    extra_mask = x >= last_off
    x_extra = x[extra_mask]
    y_extra = y[extra_mask]
    band_low: NDArray[np.floating] = y_low[extra_mask] if with_band else np.array([])
    band_high: NDArray[np.floating] = y_high[extra_mask] if with_band else np.array([])

    # Residuals of the measurements against the trend line.
    days_all = (dates - dates.iloc[0]).dt.days.astype(float).to_numpy()
    weights = df["weight"].to_numpy(dtype=float)
    predicted = fit.level_at_last + fit.slope_per_day * (days_all - last_off)
    residuals = weights - predicted
    std_res = float(residuals.std()) if len(residuals) > 1 else 0.0

    return ModelCurve(
        kind=MODEL_LINEAR,
        success=True,
        x_fit=x[fit_mask],
        y_fit=y[fit_mask],
        x_extra=x_extra,
        y_extra=y_extra,
        y_extra_low=band_low,
        y_extra_high=band_high,
        residuals=residuals,
        std_residuals=std_res,
        legend_label=f"Linear trend ({fit.slope_per_day * 7:.2f} kg/wk)",
        hline_y=None,
        hline_label="",
    )


def build_model_curve(
    df: pd.DataFrame,
    kind: str,
    config: AnalysisConfig | None = None,
    extrapolation_days: int = 0,
    with_band: bool = True,
) -> ModelCurve:
    """Fit *kind* to *df* and reduce it to a model-agnostic ``ModelCurve``.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        kind: Model identifier — ``MODEL_EXP`` or ``MODEL_LINEAR``.
        config: Analysis configuration (used by the exp model). Defaults to
            ``AnalysisConfig()``.
        extrapolation_days: Days beyond the last measurement to project.
        with_band: Whether to compute the model's uncertainty band.

    Returns:
        A ``ModelCurve``. An unknown *kind* or empty *df* yields a
        ``success=False`` curve with an explanatory ``error_message``.
    """
    if config is None:
        config = AnalysisConfig()

    if df.empty:
        return ModelCurve(kind=kind, success=False, error_message="No data to fit.")

    if kind == MODEL_EXP:
        return _build_exp_curve(df, config, extrapolation_days, with_band)
    if kind == MODEL_LINEAR:
        return _build_linear_curve(df, extrapolation_days, with_band)
    return ModelCurve(kind=kind, success=False, error_message=f"Unknown model '{kind}'.")
