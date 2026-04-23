"""Plotly figure-building functions.

Every function in this module is **pure**: it accepts a DataFrame (and
optional configuration) and returns a ``plotly.graph_objects.Figure``.
No side effects, no global state, no Dash imports.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from analysis import (
    FitResult,
    compute_derivative,
    compute_rolling_mean,
    detect_deviations,
    extrapolate_fit,
)
from viz.palettes import PALETTES, PaletteConfig

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _plotly_template(dark: bool) -> str:
    """Return the Plotly template name for the current theme.

    Args:
        dark: Whether dark mode is active.

    Returns:
        ``"plotly_dark"`` or ``"plotly_white"``.
    """
    return "plotly_dark" if dark else "plotly_white"


def _title(text: str, dark: bool) -> dict:
    """Return a Plotly title dict with styled font.

    Args:
        text: Title text.
        dark: Whether dark mode is active.

    Returns:
        A dict suitable for use as the ``title`` argument in
        ``fig.update_layout()``.
    """
    return dict(
        text=text,
        font=dict(
            size=16,
            color="#60a5fa" if dark else "#2563eb",  # blue-400 / blue-600
        ),
        x=0,
        xanchor="left",
        pad=dict(l=4),
    )


# ---------------------------------------------------------------------------
# Main weight chart (Panel 1)
# ---------------------------------------------------------------------------


def build_weight_figure(
    df: pd.DataFrame,
    fit_result: FitResult | None = None,
    palette: PaletteConfig | None = None,
    dark: bool = False,
    smoothing_window: int = 5,
    extrapolation_days: int = 0,
) -> go.Figure:
    """Build the main weight-progression figure.

    Includes raw data, rolling mean, exponential-decay fit (with optional
    extrapolation), deviation zones, and an asymptote annotation.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        fit_result: Optional fit result from ``fit_exponential_decay()``.
        palette: Colour palette.  Defaults to ``Classic``.
        dark: Whether dark mode is active.
        smoothing_window: Window size for the rolling mean.
        extrapolation_days: Number of days to extrapolate beyond data.

    Returns:
        A ``plotly.graph_objects.Figure``.
    """
    if palette is None:
        palette = PALETTES["Classic"]

    fig = go.Figure()
    template = _plotly_template(dark)

    if df.empty:
        fig.update_layout(
            template=template,
            title=_title("Weight Progression", dark),
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

    # -- Deviation zones ---------------------------------------------------
    if fit_result and fit_result.success:
        dev_df = detect_deviations(df, fit_result)
        for _, row in dev_df.iterrows():
            row_date = pd.to_datetime(row["date"])
            if row["plateau"]:
                fig.add_vrect(
                    x0=row_date - pd.Timedelta(days=3),
                    x1=row_date + pd.Timedelta(days=3),
                    fillcolor=palette.residual_above,
                    opacity=0.08,
                    line_width=0,
                    layer="below",
                )
            if row["accel"]:
                fig.add_vrect(
                    x0=row_date - pd.Timedelta(days=3),
                    x1=row_date + pd.Timedelta(days=3),
                    fillcolor=palette.residual_below,
                    opacity=0.08,
                    line_width=0,
                    layer="below",
                )

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

    # -- Exponential-decay fit (solid over data) ---------------------------
    if fit_result and fit_result.success:
        first_date = dates.iloc[0]
        fit_dates = first_date + pd.to_timedelta(fit_result.x_fit, unit="D")
        fig.add_trace(
            go.Scatter(
                x=fit_dates,
                y=fit_result.y_fit,
                mode="lines",
                name=(
                    f"Exp. decay fit (a={fit_result.params[0]:.1f}, "
                    f"\u03bb={fit_result.params[1] * 365:.2f}/yr)"
                ),
                line=dict(color=palette.fit, width=1.8),
            )
        )

        # -- Extrapolation (dashed) ----------------------------------------
        if extrapolation_days > 0:
            last_date = dates.iloc[-1].date()
            x_extra, y_extra = extrapolate_fit(
                fit_result,
                last_date=last_date,
                first_date=dates.iloc[0].date(),
                horizon_days=extrapolation_days,
            )
            if len(x_extra) > 0:
                extra_dates = first_date + pd.to_timedelta(x_extra, unit="D")
                fig.add_trace(
                    go.Scatter(
                        x=extra_dates,
                        y=y_extra,
                        mode="lines",
                        name="Extrapolation",
                        line=dict(color=palette.fit, width=1.8, dash="dash"),
                        opacity=0.6,
                    )
                )

        # -- Asymptote annotation ------------------------------------------
        c_value = fit_result.params[2]
        fig.add_hline(
            y=c_value,
            line_dash="dash",
            line_color=palette.fit,
            opacity=0.5,
            annotation_text=f"Predicted equilibrium: ~{c_value:.1f} kg",
            annotation_position="top left",
        )

    # -- Layout ------------------------------------------------------------
    fig.update_layout(
        template=template,
        title=_title("Body Weight Progression", dark),
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
            title=_title("Rate of Change (kg/week)", dark),
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
        title=_title("Rate of Change", dark),
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
    fit_result: FitResult | None = None,
    palette: PaletteConfig | None = None,
    dark: bool = False,
) -> go.Figure:
    """Build the residuals-vs-model chart.

    Args:
        df: DataFrame with ``date`` and ``weight`` columns.
        fit_result: Result from ``fit_exponential_decay()``.
        palette: Colour palette.  Defaults to ``Classic``.
        dark: Whether dark mode is active.

    Returns:
        A ``plotly.graph_objects.Figure``.
    """
    if palette is None:
        palette = PALETTES["Classic"]

    fig = go.Figure()
    template = _plotly_template(dark)

    if fit_result is None or not fit_result.success or df.empty:
        fig.update_layout(
            template=template,
            title=_title("Residuals vs. Model", dark),
            xaxis_title="Date",
            yaxis_title="Residual (kg)",
            annotations=[
                dict(
                    text="Residuals unavailable (fit failed or no data)",
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
    residuals = fit_result.residuals
    pos_mask = residuals >= 0
    neg_mask = residuals < 0

    # Above model (plateau zones)
    fig.add_trace(
        go.Scatter(
            x=dates[pos_mask],
            y=residuals[pos_mask],
            mode="markers",
            name="Above model (plateau)",
            marker=dict(color=palette.residual_above, size=8),
            fill="tozeroy",
            fillcolor=palette.residual_above,
            opacity=0.4,
        )
    )

    # Below model (acceleration zones)
    fig.add_trace(
        go.Scatter(
            x=dates[neg_mask],
            y=residuals[neg_mask],
            mode="markers",
            name="Below model (acceleration)",
            marker=dict(color=palette.residual_below, size=8),
            fill="tozeroy",
            fillcolor=palette.residual_below,
            opacity=0.4,
        )
    )

    # Connecting line
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=residuals,
            mode="lines",
            name="Residuals",
            line=dict(color="grey", width=1),
            opacity=0.5,
            showlegend=False,
        )
    )

    fig.add_hline(y=0, line_dash="dash", line_color=palette.fit, opacity=0.7)

    # +/- 1 sigma band
    if fit_result.std_residuals > 0:
        fig.add_hrect(
            y0=-fit_result.std_residuals,
            y1=fit_result.std_residuals,
            fillcolor="grey",
            opacity=0.05,
            line_width=0,
            annotation_text="\u00b11\u03c3",
            annotation_position="top left",
        )

    fig.update_layout(
        template=template,
        title=_title("Residuals vs. Exponential Decay Model", dark),
        xaxis_title="Date",
        yaxis_title="Residual (kg)",
        hovermode="x unified",
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=60, r=30, t=60, b=40),
    )

    return fig
