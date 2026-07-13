"""Chart data builders.

Every function in this module is **pure**: it accepts a DataFrame (and
optional configuration) and returns a JSON-ready ``dict`` of plain data
series — points, bands, zones — with **no rendering concerns** (no colours,
no theme, no layout). The frontend owns all rendering.

Dates are emitted as ``datetime.date`` objects (FastAPI serialises them to
ISO-8601 strings). Non-finite values (``NaN`` / ``inf``) are dropped so the
payload is always valid JSON.

This module is UI-agnostic — no FastAPI, DB, or plotting-library imports.
"""

from __future__ import annotations

import dataclasses
import math
from typing import TYPE_CHECKING

import pandas as pd

from analysis import MODEL_EXP, compute_derivative, compute_rolling_mean, energy_series

if TYPE_CHECKING:
    from collections.abc import Iterable

    from analysis import ModelCurve, ModelDiagnostics

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _points(dates: Iterable[pd.Timestamp], values: Iterable[float]) -> list[dict]:
    """Zip dates and values into ``{date, value}`` points, dropping non-finite values.

    Args:
        dates: Iterable of pandas Timestamps (rows align with *values*).
        values: Iterable of numeric values.

    Returns:
        A list of ``{"date": date, "value": float}`` dicts. Points whose value
        is ``NaN`` or infinite are omitted (the frontend renders a gap).
    """
    out: list[dict] = []
    for ts, value in zip(dates, values, strict=True):
        fvalue = float(value)
        if math.isfinite(fvalue):
            out.append({"date": ts.date(), "value": fvalue})
    return out


def _offset_dates(first_date: pd.Timestamp, offsets: Iterable[float]) -> list[pd.Timestamp]:
    """Convert day-offsets from the first measurement into Timestamps.

    Args:
        first_date: Timestamp of the first measurement (the x-origin).
        offsets: Day-offsets (``ModelCurve`` x-values are days from origin).

    Returns:
        A list of Timestamps, one per offset.
    """
    return [first_date + pd.Timedelta(days=float(offset)) for offset in offsets]


def _diagnostics_dict(diagnostics: ModelDiagnostics | None) -> dict | None:
    """Serialise fit diagnostics to a JSON-ready dict, dropping non-finite floats.

    Args:
        diagnostics: The model's diagnostics, or ``None`` when the fit failed.

    Returns:
        A dict matching the ``ModelDiagnosticsOut`` schema, with any
        non-finite float replaced by ``None``; ``None`` when *diagnostics*
        is ``None``.
    """
    if diagnostics is None:
        return None
    out = dataclasses.asdict(diagnostics)
    for key, value in out.items():
        if isinstance(value, float) and not math.isfinite(value):
            out[key] = None
    return out


def _model_series(curve: ModelCurve, first_date: pd.Timestamp, show_band: bool) -> dict:
    """Reduce a successful ``ModelCurve`` to its drawable JSON series.

    Args:
        curve: A successful model curve.
        first_date: Timestamp of the first measurement (x-origin for offsets).
        show_band: Whether to include the uncertainty band.

    Returns:
        A dict matching the ``ModelSeriesOut`` schema.
    """
    fit = _points(_offset_dates(first_date, curve.x_fit), curve.y_fit)

    projection: list[dict] = []
    band: list[dict] = []
    if len(curve.x_extra) > 0:
        extra_dates = _offset_dates(first_date, curve.x_extra)
        projection = _points(extra_dates, curve.y_extra)
        has_band = (
            show_band
            and len(curve.y_extra_low) == len(curve.x_extra)
            and len(curve.y_extra_high) == len(curve.x_extra)
        )
        if has_band:
            for ts, low, high in zip(
                extra_dates, curve.y_extra_low, curve.y_extra_high, strict=True
            ):
                flow, fhigh = float(low), float(high)
                if math.isfinite(flow) and math.isfinite(fhigh):
                    band.append({"date": ts.date(), "lower": flow, "upper": fhigh})

    asymptote = (
        float(curve.hline_y)
        if curve.hline_y is not None and math.isfinite(curve.hline_y)
        else None
    )

    return {
        "id": curve.kind,
        "label": curve.legend_label,
        "fit": fit,
        "projection": projection,
        "band": band,
        "asymptote": asymptote,
        "asymptote_label": curve.hline_label,
        "warning": curve.warning,
        "diagnostics": _diagnostics_dict(curve.diagnostics),
    }


def _deviation_zones(df: pd.DataFrame, exp_curve: ModelCurve) -> list[dict]:
    """Derive plateau / acceleration zones from the exponential-fit residuals.

    A measurement whose residual exceeds +0.5σ is a plateau (above the fit);
    below -0.5σ is an acceleration. Each flagged measurement yields a ±3-day
    zone centred on its date.

    Args:
        df: DataFrame with a ``date`` column (rows align with the residuals).
        exp_curve: A successful exponential ``ModelCurve``.

    Returns:
        A list of dicts matching the ``DeviationZoneOut`` schema (possibly
        empty).
    """
    residuals = exp_curve.residuals
    if exp_curve.std_residuals <= 0 or len(residuals) != len(df):
        return []

    threshold = 0.5 * exp_curve.std_residuals
    dates = pd.to_datetime(df["date"]).reset_index(drop=True)
    zones: list[dict] = []
    for i, residual in enumerate(residuals):
        value = float(residual)
        if value > threshold:
            kind = "plateau"
        elif value < -threshold:
            kind = "acceleration"
        else:
            continue
        row_date = dates.iloc[i]
        zones.append(
            {
                "start": (row_date - pd.Timedelta(days=3)).date(),
                "end": (row_date + pd.Timedelta(days=3)).date(),
                "kind": kind,
            }
        )
    return zones


# ---------------------------------------------------------------------------
# Weight chart
# ---------------------------------------------------------------------------


def build_weight_chart_data(
    df: pd.DataFrame,
    model_curves: list[ModelCurve] | None = None,
    smoothing_window: int = 5,
    goal_weight: float | None = None,
    show_band: bool = True,
) -> dict:
    """Build the data series for the main weight-progression chart.

    Includes raw measurements, the rolling mean, any number of selected
    prediction-model overlays (each with optional projection and uncertainty
    band), deviation zones from the exponential model, and an optional goal
    weight.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        model_curves: Prediction-model overlays. Empty / ``None`` yields raw
            data and the rolling mean only.
        smoothing_window: Window size for the rolling mean.
        goal_weight: Optional target weight (kg).
        show_band: Whether to include each model's uncertainty band.

    Returns:
        A dict matching the ``WeightChartData`` schema.
    """
    curves = [c for c in (model_curves or []) if c.success]

    if df.empty:
        return {
            "raw": [],
            "smoothed": [],
            "smoothing_window": smoothing_window,
            "models": [],
            "zones": [],
            "goal_weight": goal_weight,
        }

    dates = pd.to_datetime(df["date"])
    first_date = dates.iloc[0]

    raw = _points(dates, df["weight"])
    rolling = compute_rolling_mean(df, window=smoothing_window)
    smoothed = _points(dates, rolling)

    models = [_model_series(c, first_date, show_band) for c in curves]

    exp_curve = next((c for c in curves if c.kind == MODEL_EXP), None)
    zones = _deviation_zones(df, exp_curve) if exp_curve is not None else []

    return {
        "raw": raw,
        "smoothed": smoothed,
        "smoothing_window": smoothing_window,
        "models": models,
        "zones": zones,
        "goal_weight": goal_weight,
    }


# ---------------------------------------------------------------------------
# Derivative chart
# ---------------------------------------------------------------------------


def build_derivative_chart_data(df: pd.DataFrame) -> dict:
    """Build the data series for the rate-of-change (kg/week) chart.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.

    Returns:
        A dict matching the ``DerivativeChartData`` schema. The raw rate of the
        first measurement is undefined and therefore omitted.
    """
    if df.empty or len(df) < 2:
        return {"bars": [], "smoothed": []}

    deriv_df = compute_derivative(df)
    dates = pd.to_datetime(deriv_df["date"])

    bars: list[dict] = []
    for ts, rate in zip(dates, deriv_df["deriv_kgweek"], strict=True):
        frate = float(rate)
        if math.isfinite(frate):
            bars.append({"date": ts.date(), "rate": frate})

    smoothed = _points(dates, deriv_df["deriv_smooth"])
    return {"bars": bars, "smoothed": smoothed}


# ---------------------------------------------------------------------------
# Energy-balance chart
# ---------------------------------------------------------------------------


def build_energy_chart_data(df: pd.DataFrame, window: int = 5) -> dict:
    """Build the data series for the estimated daily energy-balance chart.

    Each bar is the estimated daily energy balance (kcal) at a measurement,
    derived from the smoothed weight-change rate (negative = deficit). The
    frontend renders the bars, the zero baseline and the tooltip.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        window: Centred rolling-mean window passed through to
            :func:`analysis.energy_series`.

    Returns:
        A dict matching the ``EnergyChartData`` schema. Empty ``bars`` when
        there are fewer than two measurements.
    """
    return {"bars": energy_series(df, window)}


# ---------------------------------------------------------------------------
# Residuals chart
# ---------------------------------------------------------------------------


def build_residuals_chart_data(
    df: pd.DataFrame,
    model_curves: list[ModelCurve] | None = None,
) -> dict:
    """Build the data series for the residuals-vs-model chart.

    Each successful model whose residuals align with the data contributes one
    residual series. The ±1σ band magnitude is taken from the first such model.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        model_curves: Prediction-model overlays whose residuals to plot.

    Returns:
        A dict matching the ``ResidualsChartData`` schema.
    """
    curves = [
        c
        for c in (model_curves or [])
        if c.success and len(c.residuals) == len(df)
    ]

    if df.empty or not curves:
        return {"series": [], "sigma": 0.0}

    dates = pd.to_datetime(df["date"])
    series = [
        {
            "id": curve.kind,
            "label": f"{curve.legend_label} residuals",
            "points": _points(dates, curve.residuals),
        }
        for curve in curves
    ]

    sigma = float(curves[0].std_residuals) if curves[0].std_residuals > 0 else 0.0
    return {"series": series, "sigma": sigma}
