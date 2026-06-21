"""Plotly figure-building functions.

Every function in this module is **pure**: it accepts a DataFrame (and
optional configuration) and returns a ``plotly.graph_objects.Figure``.
No side effects, no global state, no Dash imports.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from analysis import (
    MODEL_EXP,
    ModelCurve,
    compute_derivative,
    compute_rolling_mean,
)
from viz.palettes import PALETTES, PaletteConfig

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    """Convert a ``#RRGGBB`` colour to a Plotly ``rgba(...)`` string.

    Args:
        hex_color: Hex colour string (with or without leading ``#``).
        alpha: Opacity in the range [0, 1].

    Returns:
        An ``rgba(r, g, b, a)`` string.
    """
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r}, {g}, {b}, {alpha})"


def _curve_color(curve: ModelCurve, palette: PaletteConfig) -> str:
    """Return the palette colour for a model curve.

    Args:
        curve: The model curve.
        palette: Active colour palette.

    Returns:
        The exp-fit colour for the exponential model, the linear-trend colour
        otherwise.
    """
    return palette.fit if curve.kind == MODEL_EXP else palette.fit_linear


def _plotly_template(dark: bool) -> str:
    """Return the Plotly template name for the current theme.

    Args:
        dark: Whether dark mode is active.

    Returns:
        ``"plotly_dark"`` or ``"plotly_white"``.
    """
    return "plotly_dark" if dark else "plotly_white"


def _title(text: str, color: str) -> dict:
    """Return a Plotly title dict styled with the active palette accent color.

    Args:
        text: Title text.
        color: Hex color string from the active palette.

    Returns:
        A dict suitable for use as the ``title`` argument in
        ``fig.update_layout()``.
    """
    return dict(
        text=f"<b>{text}</b>",
        font=dict(size=16, color=color),
        x=0,
        xanchor="left",
        pad=dict(l=16, t=8, b=4),
    )


# ---------------------------------------------------------------------------
# Main weight chart (Panel 1)
# ---------------------------------------------------------------------------


def _draw_deviation_zones(
    fig: go.Figure,
    df: pd.DataFrame,
    exp_curve: ModelCurve,
    palette: PaletteConfig,
) -> None:
    """Shade plateau / acceleration zones from the exponential fit residuals.

    Args:
        fig: Figure to mutate.
        df: DataFrame with a ``date`` column (rows align with the residuals).
        exp_curve: A successful exponential ``ModelCurve``.
        palette: Active colour palette.
    """
    residuals = exp_curve.residuals
    if exp_curve.std_residuals <= 0 or len(residuals) != len(df):
        return

    threshold = 0.5 * exp_curve.std_residuals
    dates = pd.to_datetime(df["date"]).reset_index(drop=True)
    for i, residual in enumerate(residuals):
        if residual > threshold:
            color = palette.residual_above
        elif residual < -threshold:
            color = palette.residual_below
        else:
            continue
        row_date = dates.iloc[i]
        fig.add_vrect(
            x0=row_date - pd.Timedelta(days=3),
            x1=row_date + pd.Timedelta(days=3),
            fillcolor=color,
            opacity=0.08,
            line_width=0,
            layer="below",
        )


def _draw_model_curve(
    fig: go.Figure,
    curve: ModelCurve,
    first_date: pd.Timestamp,
    palette: PaletteConfig,
    show_band: bool,
) -> None:
    """Draw one model's in-sample line, extrapolation, band and asymptote.

    Args:
        fig: Figure to mutate.
        curve: A successful ``ModelCurve``.
        first_date: Date of the first measurement (x-origin for day offsets).
        palette: Active colour palette.
        show_band: Whether to render the uncertainty band.
    """
    color = _curve_color(curve, palette)

    # -- In-sample line ----------------------------------------------------
    fit_dates = first_date + pd.to_timedelta(curve.x_fit, unit="D")
    fig.add_trace(
        go.Scatter(
            x=fit_dates,
            y=curve.y_fit,
            mode="lines",
            name=curve.legend_label,
            line=dict(color=color, width=1.8),
        )
    )

    # -- Uncertainty band over the extrapolation --------------------------
    has_band = show_band and len(curve.y_extra_low) > 0 and len(curve.y_extra) > 0
    if has_band:
        band_dates = first_date + pd.to_timedelta(curve.x_extra, unit="D")
        fig.add_trace(
            go.Scatter(
                x=band_dates,
                y=curve.y_extra_low,
                mode="lines",
                line=dict(width=0),
                hoverinfo="skip",
                showlegend=False,
            )
        )
        fig.add_trace(
            go.Scatter(
                x=band_dates,
                y=curve.y_extra_high,
                mode="lines",
                line=dict(width=0),
                fill="tonexty",
                fillcolor=_hex_to_rgba(palette.band, 0.18),
                name=f"{curve.legend_label} band",
                hoverinfo="skip",
                showlegend=False,
            )
        )

    # -- Extrapolation (dashed centre line) -------------------------------
    if len(curve.x_extra) > 0:
        extra_dates = first_date + pd.to_timedelta(curve.x_extra, unit="D")
        fig.add_trace(
            go.Scatter(
                x=extra_dates,
                y=curve.y_extra,
                mode="lines",
                name=f"{curve.legend_label} \u2014 projection",
                line=dict(color=color, width=1.8, dash="dash"),
                opacity=0.6,
                showlegend=False,
            )
        )

    # -- Asymptote annotation (exp only) ----------------------------------
    if curve.hline_y is not None:
        fig.add_hline(
            y=curve.hline_y,
            line_dash="dash",
            line_color=color,
            opacity=0.5,
            annotation_text=curve.hline_label,
            annotation_position="top left",
        )


def build_weight_figure(
    df: pd.DataFrame,
    model_curves: list[ModelCurve] | None = None,
    palette: PaletteConfig | None = None,
    dark: bool = False,
    smoothing_window: int = 5,
    goal_weight: float | None = None,
    show_band: bool = True,
) -> go.Figure:
    """Build the main weight-progression figure.

    Includes raw data, rolling mean, any number of selected prediction-model
    overlays (each with an optional extrapolation and uncertainty band),
    deviation zones from the exponential model, and an optional goal line.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        model_curves: Prediction-model overlays to draw. Empty / ``None``
            renders raw data and the rolling mean only.
        palette: Colour palette.  Defaults to ``Classic``.
        dark: Whether dark mode is active.
        smoothing_window: Window size for the rolling mean.
        goal_weight: Optional target weight (kg) drawn as a horizontal
            reference line.
        show_band: Whether to render each model's uncertainty band.

    Returns:
        A ``plotly.graph_objects.Figure``.
    """
    if palette is None:
        palette = PALETTES["Classic"]
    curves = [c for c in (model_curves or []) if c.success]

    fig = go.Figure()
    template = _plotly_template(dark)

    if df.empty:
        fig.update_layout(
            template=template,
            title=_title("Weight Progression", palette.accent),
            xaxis_title="Date",
            yaxis_title="Weight (kg)",
            annotations=[
                dict(
                    text="No data available. Add measurements to get started.",
                    xref="paper",
                    yref="paper",
                    x=0.5,
                    y=0.5,
                    showarrow=False,
                    font=dict(size=16),
                )
            ],
        )
        return fig

    dates = pd.to_datetime(df["date"])
    first_date = dates.iloc[0]

    # -- Deviation zones (from the exponential model when selected) --------
    exp_curve = next((c for c in curves if c.kind == MODEL_EXP), None)
    if exp_curve is not None:
        _draw_deviation_zones(fig, df, exp_curve, palette)

    # -- Raw data ----------------------------------------------------------
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=df["weight"],
            mode="lines+markers",
            name="Raw measurements",
            line=dict(color=palette.raw, width=1.4),
            marker=dict(color=palette.raw, size=7, line=dict(color="white", width=0.5)),
            opacity=0.8,
        )
    )

    # -- Rolling mean ------------------------------------------------------
    rolling = compute_rolling_mean(df, window=smoothing_window)
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=rolling,
            mode="lines",
            name=f"Rolling mean ({smoothing_window}-pt)",
            line=dict(color=palette.smoothed, width=2.4),
        )
    )

    # -- Model overlays ----------------------------------------------------
    for curve in curves:
        _draw_model_curve(fig, curve, first_date, palette, show_band)

    # -- Model warnings ----------------------------------------------------
    warnings = [c.warning for c in curves if c.warning]
    if warnings:
        fig.add_annotation(
            text="\u26a0 " + " ".join(warnings),
            xref="paper",
            yref="paper",
            x=0,
            y=-0.18,
            showarrow=False,
            xanchor="left",
            font=dict(size=11, color=palette.residual_above),
        )

    # -- Goal line ---------------------------------------------------------
    if goal_weight is not None:
        fig.add_hline(
            y=goal_weight,
            line_dash="dot",
            line_color=palette.accent,
            line_width=2,
            opacity=0.8,
            annotation_text=f"Goal: {goal_weight:.1f} kg",
            annotation_position="bottom right",
        )

    # -- Layout ------------------------------------------------------------
    fig.update_layout(
        template=template,
        title=_title("Body Weight Progression", palette.accent),
        xaxis_title="Date",
        yaxis_title="Weight (kg)",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        hovermode="x unified",
        xaxis=dict(
            rangeselector=dict(
                buttons=[
                    dict(count=1, label="1M", step="month", stepmode="backward"),
                    dict(count=3, label="3M", step="month", stepmode="backward"),
                    dict(count=6, label="6M", step="month", stepmode="backward"),
                    dict(count=1, label="YTD", step="year", stepmode="todate"),
                    dict(label="All", step="all"),
                ]
            ),
            rangeslider=dict(visible=True),
        ),
        margin=dict(l=60, r=30, t=80, b=40),
    )

    return fig


# ---------------------------------------------------------------------------
# Derivative chart (Panel 2)
# ---------------------------------------------------------------------------


def build_derivative_figure(
    df: pd.DataFrame,
    palette: PaletteConfig | None = None,
    dark: bool = False,
) -> go.Figure:
    """Build the rate-of-change (kg/week) bar + line chart.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        palette: Colour palette.  Defaults to ``Classic``.
        dark: Whether dark mode is active.

    Returns:
        A ``plotly.graph_objects.Figure``.
    """
    if palette is None:
        palette = PALETTES["Classic"]

    fig = go.Figure()
    template = _plotly_template(dark)

    if df.empty or len(df) < 2:
        fig.update_layout(
            template=template,
            title=_title("Rate of Change (kg/week)", palette.accent),
            xaxis_title="Date",
            yaxis_title="Rate (kg/week)",
        )
        return fig

    deriv_df = compute_derivative(df)
    dates = pd.to_datetime(deriv_df["date"])

    # Colour bars: green when losing, red when gaining.
    bar_colors = [
        palette.derivative if v < 0 else palette.derivative_pos
        for v in deriv_df["deriv_kgweek"].fillna(0)
    ]

    fig.add_trace(
        go.Bar(
            x=dates,
            y=deriv_df["deriv_kgweek"],
            name="Rate (kg/week)",
            marker_color=bar_colors,
            opacity=0.55,
        )
    )

    fig.add_trace(
        go.Scatter(
            x=dates,
            y=deriv_df["deriv_smooth"],
            mode="lines",
            name="Smoothed rate",
            line=dict(color=palette.derivative_smooth, width=1.8),
        )
    )

    fig.add_hline(y=0, line_dash="dash", line_color="grey", opacity=0.5)

    fig.update_layout(
        template=template,
        title=_title("Rate of Change", palette.accent),
        xaxis_title="Date",
        yaxis_title="Rate (kg/week)",
        hovermode="x unified",
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=60, r=30, t=60, b=40),
    )

    return fig


# ---------------------------------------------------------------------------
# Residuals chart (Panel 3)
# ---------------------------------------------------------------------------


def build_residuals_figure(
    df: pd.DataFrame,
    model_curves: list[ModelCurve] | None = None,
    palette: PaletteConfig | None = None,
    dark: bool = False,
) -> go.Figure:
    """Build the residuals-vs-model chart for every selected model.

    Each successful model contributes one residual line (coloured per model).
    The \u00b11\u03c3 reference band is drawn from the first successful model.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        model_curves: Prediction-model overlays whose residuals to plot.
        palette: Colour palette.  Defaults to ``Classic``.
        dark: Whether dark mode is active.

    Returns:
        A ``plotly.graph_objects.Figure``.
    """
    if palette is None:
        palette = PALETTES["Classic"]
    curves = [
        c
        for c in (model_curves or [])
        if c.success and len(c.residuals) == len(df)
    ]

    fig = go.Figure()
    template = _plotly_template(dark)

    if df.empty or not curves:
        fig.update_layout(
            template=template,
            title=_title("Residuals vs. Model", palette.accent),
            xaxis_title="Date",
            yaxis_title="Residual (kg)",
            annotations=[
                dict(
                    text="Residuals unavailable (no model fit or no data)",
                    xref="paper",
                    yref="paper",
                    x=0.5,
                    y=0.5,
                    showarrow=False,
                    font=dict(size=14),
                )
            ],
        )
        return fig

    dates = pd.to_datetime(df["date"])

    for curve in curves:
        color = _curve_color(curve, palette)
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=curve.residuals,
                mode="lines+markers",
                name=f"{curve.legend_label} residuals",
                line=dict(color=color, width=1.4),
                marker=dict(color=color, size=6),
            )
        )

    fig.add_hline(y=0, line_dash="dash", line_color="grey", opacity=0.7)

    # \u00b11\u03c3 band from the first model.
    first = curves[0]
    if first.std_residuals > 0:
        fig.add_hrect(
            y0=-first.std_residuals,
            y1=first.std_residuals,
            fillcolor="grey",
            opacity=0.05,
            line_width=0,
            annotation_text="\u00b11\u03c3",
            annotation_position="top left",
        )

    fig.update_layout(
        template=template,
        title=_title("Residuals vs. Model", palette.accent),
        xaxis_title="Date",
        yaxis_title="Residual (kg)",
        hovermode="x unified",
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=60, r=30, t=60, b=40),
    )

    return fig
