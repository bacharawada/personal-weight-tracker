"""Dash callbacks for the Weight Tracker application.

This module contains **only** callback definitions.  All business logic
is delegated to ``analysis``, ``viz``, and ``db`` packages.

The single public entry point is ``register_callbacks(app, engine)``
which wires every callback to the given Dash app instance.
"""

from __future__ import annotations

import datetime
import io
from typing import TYPE_CHECKING, Any

import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, no_update
from dash.exceptions import PreventUpdate

from analysis import AnalysisConfig, compute_summary_stats, fit_exponential_decay
from db import DuplicateDateError, NotFoundError, WeightDataStore, get_db_mtime
from viz import (
    PALETTES,
    build_derivative_figure,
    build_residuals_figure,
    build_weight_figure,
)

if TYPE_CHECKING:
    import dash
    from sqlalchemy.engine import Engine

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DB_POLL_INTERVAL_MS = 5000
"""Polling interval in milliseconds for detecting external DB changes."""


def register_callbacks(app: dash.Dash, engine: Engine) -> None:
    """Register all Dash callbacks on *app*.

    Args:
        app: The Dash application instance.
        engine: SQLAlchemy engine for database access.
    """
    store = WeightDataStore(engine)

    # ===================================================================
    # Theme toggle
    # ===================================================================

    @app.callback(
        Output("store-theme", "data"),
        Input("theme-toggle", "n_clicks"),
        State("store-theme", "data"),
    )
    def toggle_theme(n_clicks: int, current_theme: str) -> str:
        """Toggle between light and dark themes.

        Args:
            n_clicks: Number of times the toggle has been clicked.
            current_theme: The currently active theme name.

        Returns:
            The new theme name (``"light"`` or ``"dark"``).
        """
        if n_clicks == 0:
            raise PreventUpdate
        return "dark" if current_theme == "light" else "light"

    # ===================================================================
    # DB polling — detect external changes
    # ===================================================================

    @app.callback(
        Output("store-db-mtime", "data"),
        Input("interval-db-poll", "n_intervals"),
        State("store-db-mtime", "data"),
    )
    def poll_db_mtime(n_intervals: int, current_mtime: float) -> float:
        """Check if the DB file has been modified externally.

        Args:
            n_intervals: Interval tick count.
            current_mtime: Last known mtime.

        Returns:
            Updated mtime, or ``no_update`` if unchanged.
        """
        new_mtime = get_db_mtime()
        if new_mtime == current_mtime:
            raise PreventUpdate
        return new_mtime

    # ===================================================================
    # Add measurement
    # ===================================================================

    @app.callback(
        Output("add-feedback", "children"),
        Output("store-db-mtime", "data", allow_duplicate=True),
        Input("btn-add", "n_clicks"),
        State("input-date", "date"),
        State("input-weight", "value"),
        prevent_initial_call=True,
    )
    def add_measurement(
        n_clicks: int, date_str: str | None, weight: float | None
    ) -> tuple[Any, float]:
        """Add a new weight measurement.

        Args:
            n_clicks: Click count of the Add button.
            date_str: ISO date string from the date picker.
            weight: Weight value from the numeric input.

        Returns:
            Tuple of feedback message and updated DB mtime.
        """
        if not date_str or weight is None:
            return (
                dbc.Alert("Please fill in both date and weight.", color="warning"),
                no_update,
            )

        date = datetime.date.fromisoformat(date_str[:10])

        # Reject future dates.
        if date > datetime.date.today():
            return (
                dbc.Alert("Future dates are not allowed.", color="warning"),
                no_update,
            )

        # Reject out-of-range weights.
        if weight < 40 or weight > 300:
            return (
                dbc.Alert(
                    "Weight must be between 40 and 300 kg.", color="warning"
                ),
                no_update,
            )

        try:
            store.add(date, weight)
        except DuplicateDateError as exc:
            return (
                dbc.Alert(str(exc), color="danger"),
                no_update,
            )

        return (
            dbc.Alert(
                f"Added: {date} — {weight} kg",
                color="success",
                duration=4000,
            ),
            get_db_mtime(),
        )

    # ===================================================================
    # Point selection on weight chart
    # ===================================================================

    @app.callback(
        Output("store-selected-point", "data"),
        Output("delete-info", "children"),
        Output("btn-delete", "disabled"),
        Input("graph-weight", "clickData"),
        prevent_initial_call=True,
    )
    def select_point(click_data: dict | None) -> tuple[dict | None, str, bool]:
        """Handle click on a data point for deletion.

        Args:
            click_data: Plotly click event data.

        Returns:
            Tuple of selected point data, info text, and delete button
            disabled state.
        """
        if click_data is None:
            raise PreventUpdate

        point = click_data["points"][0]
        date_str = point.get("x", "")
        weight = point.get("y", "")

        return (
            {"date": str(date_str)[:10], "weight": weight},
            f"Selected: {str(date_str)[:10]} — {weight} kg",
            False,
        )

    # ===================================================================
    # Delete measurement (two-step confirmation)
    # ===================================================================

    @app.callback(
        Output("btn-confirm-delete", "style"),
        Input("btn-delete", "n_clicks"),
        State("store-selected-point", "data"),
        prevent_initial_call=True,
    )
    def show_confirm_delete(n_clicks: int, selected: dict | None) -> dict:
        """Show the confirmation button after Delete is clicked.

        Args:
            n_clicks: Click count of Delete button.
            selected: Currently selected point data.

        Returns:
            CSS style dict to show the confirmation button.
        """
        if not selected:
            raise PreventUpdate
        return {"display": "block"}

    @app.callback(
        Output("delete-feedback", "children"),
        Output("store-db-mtime", "data", allow_duplicate=True),
        Output("btn-confirm-delete", "style", allow_duplicate=True),
        Output("store-selected-point", "data", allow_duplicate=True),
        Output("delete-info", "children", allow_duplicate=True),
        Output("btn-delete", "disabled", allow_duplicate=True),
        Input("btn-confirm-delete", "n_clicks"),
        State("store-selected-point", "data"),
        prevent_initial_call=True,
    )
    def confirm_delete(
        n_clicks: int, selected: dict | None
    ) -> tuple[Any, float, dict, None, str, bool]:
        """Execute the deletion after confirmation.

        Args:
            n_clicks: Click count of Confirm button.
            selected: Currently selected point data.

        Returns:
            Tuple of feedback, updated mtime, hide confirmation button,
            reset selected point, reset info text, disable delete button.
        """
        if not selected:
            raise PreventUpdate

        date = datetime.date.fromisoformat(selected["date"])
        try:
            store.remove(date)
        except NotFoundError as exc:
            return (
                dbc.Alert(str(exc), color="danger"),
                no_update,
                {"display": "none"},
                None,
                "Click a point on the chart to select it.",
                True,
            )

        return (
            dbc.Alert(
                f"Deleted: {date}",
                color="info",
                duration=4000,
            ),
            get_db_mtime(),
            {"display": "none"},
            None,
            "Click a point on the chart to select it.",
            True,
        )

    # ===================================================================
    # Main graph update (triggered by any data or config change)
    # ===================================================================

    @app.callback(
        Output("graph-weight", "figure"),
        Output("graph-derivative", "figure"),
        Output("graph-residuals", "figure"),
        Output("stat-total-loss", "children"),
        Output("stat-total-loss", "style"),
        Output("stat-avg-loss", "children"),
        Output("stat-current-trend", "children"),
        Output("stat-current-trend", "style"),
        Output("stat-days-tracked", "children"),
        Output("warning-banner", "children"),
        Output("btn-export-png", "disabled"),
        Output("btn-export-csv", "disabled"),
        Input("store-db-mtime", "data"),
        Input("store-theme", "data"),
        Input("slider-smoothing", "value"),
        Input("radio-horizon", "value"),
        Input("select-palette", "value"),
    )
    def update_graphs(
        db_mtime: float,
        theme: str,
        smoothing_window: int,
        horizon_days: int,
        palette_name: str,
    ) -> tuple:
        """Rebuild all graphs and stats when data or settings change.

        Args:
            db_mtime: Current DB modification time (triggers on change).
            theme: Active theme name.
            smoothing_window: Rolling-mean window size.
            horizon_days: Extrapolation horizon in days.
            palette_name: Active palette name.

        Returns:
            Tuple of all output values for the three graphs, four stats,
            warning banner, and export button states.
        """
        dark = theme == "dark"
        palette = PALETTES.get(palette_name, PALETTES["Classic"])

        df = store.get_all()
        is_empty = df.empty

        # -- Analysis --
        config = AnalysisConfig(smoothing_window=smoothing_window)
        fit_result = fit_exponential_decay(df, config) if not is_empty else None

        # -- Warning banner --
        warning = None
        if fit_result and not fit_result.success:
            warning = dbc.Alert(
                f"Curve fit warning: {fit_result.error_message}. "
                "Showing raw data only.",
                color="warning",
                dismissable=True,
            )

        # -- Figures --
        fig_weight = build_weight_figure(
            df,
            fit_result=fit_result,
            palette=palette,
            dark=dark,
            smoothing_window=smoothing_window,
            extrapolation_days=horizon_days,
        )
        fig_deriv = build_derivative_figure(df, palette=palette, dark=dark)
        fig_residuals = build_residuals_figure(
            df, fit_result=fit_result, palette=palette, dark=dark
        )

        # -- Stats --
        stats = compute_summary_stats(df)

        total_loss_text = f"{stats.total_loss_kg:+.1f} kg"
        total_loss_style = (
            {"color": "green"} if stats.total_loss_kg > 0 else {"color": "red"}
        )

        avg_loss_text = f"{stats.avg_loss_per_week:+.2f} kg/wk"

        trend_text = f"{stats.current_trend:+.2f} kg/wk"
        if stats.current_trend < -0.1:
            trend_style = {"color": "green"}
        elif stats.current_trend > 0.1:
            trend_style = {"color": "red"}
        else:
            trend_style = {"color": "grey"}

        days_text = str(stats.days_tracked)

        return (
            fig_weight,
            fig_deriv,
            fig_residuals,
            total_loss_text,
            total_loss_style,
            avg_loss_text,
            trend_text,
            trend_style,
            days_text,
            warning,
            is_empty,
            is_empty,
        )

    # ===================================================================
    # Export CSV
    # ===================================================================

    @app.callback(
        Output("download-csv", "data"),
        Input("btn-export-csv", "n_clicks"),
        prevent_initial_call=True,
    )
    def export_csv(n_clicks: int) -> dict:
        """Export all measurements as a CSV download.

        Args:
            n_clicks: Click count of the Export CSV button.

        Returns:
            A ``dcc.send_data_frame`` dict for browser download.
        """
        df = store.get_all()
        if df.empty:
            raise PreventUpdate
        return dcc.send_data_frame(df.to_csv, "measurements.csv", index=False)

    # ===================================================================
    # Export PNG
    # ===================================================================

    @app.callback(
        Output("download-png", "data"),
        Input("btn-export-png", "n_clicks"),
        State("store-theme", "data"),
        State("slider-smoothing", "value"),
        State("radio-horizon", "value"),
        State("select-palette", "value"),
        prevent_initial_call=True,
    )
    def export_png(
        n_clicks: int,
        theme: str,
        smoothing_window: int,
        horizon_days: int,
        palette_name: str,
    ) -> dict:
        """Export the main weight chart as a PNG download.

        Args:
            n_clicks: Click count of the Export PNG button.
            theme: Active theme name.
            smoothing_window: Rolling-mean window size.
            horizon_days: Extrapolation horizon in days.
            palette_name: Active palette name.

        Returns:
            A ``dcc.send_bytes`` dict for browser download.
        """
        df = store.get_all()
        if df.empty:
            raise PreventUpdate

        dark = theme == "dark"
        palette = PALETTES.get(palette_name, PALETTES["Classic"])
        config = AnalysisConfig(smoothing_window=smoothing_window)
        fit_result = fit_exponential_decay(df, config)

        fig = build_weight_figure(
            df,
            fit_result=fit_result,
            palette=palette,
            dark=dark,
            smoothing_window=smoothing_window,
            extrapolation_days=horizon_days,
        )

        buf = io.BytesIO()
        fig.write_image(buf, format="png", width=1200, height=700, scale=2)
        buf.seek(0)

        return dcc.send_bytes(buf.getvalue(), "weight_chart.png")
