"""Dash application entry point and layout.

Creates the Dash app, defines the full page layout (navbar, stats panel,
charts, sidebar controls), and ensures the database table exists on
startup.  All callbacks are registered in ``ui.callbacks``.

Usage::

    python -m ui.layout
"""

from __future__ import annotations

import dash
import dash_bootstrap_components as dbc
from dash import dcc, html

from db import get_engine, metadata
from ui.callbacks import register_callbacks
from viz import PALETTES

# ---------------------------------------------------------------------------
# Bootstrap + app init
# ---------------------------------------------------------------------------

app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True,
    title="Weight Tracker",
)
server = app.server

# ---------------------------------------------------------------------------
# Ensure DB table exists on startup (but do NOT seed from CSV)
# ---------------------------------------------------------------------------

engine = get_engine()
metadata.create_all(engine, checkfirst=True)

# ---------------------------------------------------------------------------
# Layout components
# ---------------------------------------------------------------------------


def _navbar() -> dbc.Navbar:
    """Build the top navigation bar with theme toggle."""
    return dbc.Navbar(
        dbc.Container(
            [
                dbc.NavbarBrand("Weight Tracker", className="fs-4 fw-bold"),
                dbc.Nav(
                    [
                        dbc.Button(
                            html.I(className="bi bi-sun-fill"),
                            id="theme-toggle",
                            color="link",
                            className="text-white fs-5",
                            n_clicks=0,
                        ),
                    ],
                    className="ms-auto",
                    navbar=True,
                ),
            ],
            fluid=True,
        ),
        color="primary",
        dark=True,
        className="mb-3",
    )


def _stats_cards() -> dbc.Row:
    """Build the four KPI stat cards."""
    card_style = {"textAlign": "center"}
    return dbc.Row(
        [
            dbc.Col(
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H6("Total Loss", className="text-muted"),
                            html.H4(id="stat-total-loss", children="-- kg"),
                        ],
                        style=card_style,
                    ),
                    className="shadow-sm",
                ),
                md=3,
            ),
            dbc.Col(
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H6("Avg Loss/Week", className="text-muted"),
                            html.H4(id="stat-avg-loss", children="-- kg/wk"),
                        ],
                        style=card_style,
                    ),
                    className="shadow-sm",
                ),
                md=3,
            ),
            dbc.Col(
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H6("Current Trend", className="text-muted"),
                            html.H4(id="stat-current-trend", children="-- kg/wk"),
                        ],
                        style=card_style,
                    ),
                    className="shadow-sm",
                ),
                md=3,
            ),
            dbc.Col(
                dbc.Card(
                    dbc.CardBody(
                        [
                            html.H6("Days Tracked", className="text-muted"),
                            html.H4(id="stat-days-tracked", children="--"),
                        ],
                        style=card_style,
                    ),
                    className="shadow-sm",
                ),
                md=3,
            ),
        ],
        className="mb-3 g-3",
    )


def _controls_sidebar() -> dbc.Card:
    """Build the sidebar with all user controls."""
    return dbc.Card(
        dbc.CardBody(
            [
                html.H5("Controls", className="mb-3"),
                # -- Add measurement --
                html.Hr(),
                html.H6("Add Measurement"),
                dbc.Label("Date"),
                dcc.DatePickerSingle(
                    id="input-date",
                    display_format="YYYY-MM-DD",
                    placeholder="Select date",
                    className="mb-2 w-100",
                ),
                dbc.Label("Weight (kg)"),
                dbc.Input(
                    id="input-weight",
                    type="number",
                    min=40,
                    max=300,
                    step=0.05,
                    placeholder="e.g. 75.5",
                    className="mb-2",
                ),
                dbc.Button(
                    "Add",
                    id="btn-add",
                    color="primary",
                    className="w-100 mb-2",
                    n_clicks=0,
                ),
                html.Div(id="add-feedback", className="mb-3"),
                # -- Delete measurement --
                html.Hr(),
                html.H6("Delete Measurement"),
                html.Div(id="delete-info", children="Click a point on the chart to select it."),
                dbc.Button(
                    "Delete Selected Point",
                    id="btn-delete",
                    color="danger",
                    outline=True,
                    className="w-100 mb-1",
                    n_clicks=0,
                    disabled=True,
                ),
                dbc.Button(
                    "Confirm Deletion",
                    id="btn-confirm-delete",
                    color="danger",
                    className="w-100 mb-2",
                    n_clicks=0,
                    style={"display": "none"},
                ),
                html.Div(id="delete-feedback", className="mb-3"),
                # -- Smoothing window --
                html.Hr(),
                html.H6("Smoothing Window"),
                dcc.Slider(
                    id="slider-smoothing",
                    min=3,
                    max=10,
                    step=1,
                    value=5,
                    marks={i: str(i) for i in range(3, 11)},
                ),
                # -- Extrapolation horizon --
                html.Hr(),
                html.H6("Extrapolation Horizon"),
                dbc.RadioItems(
                    id="radio-horizon",
                    options=[
                        {"label": "4 weeks", "value": 28},
                        {"label": "8 weeks", "value": 56},
                        {"label": "3 months", "value": 90},
                        {"label": "6 months", "value": 180},
                    ],
                    value=56,
                    inline=True,
                    className="mb-3",
                ),
                # -- Palette picker --
                html.Hr(),
                html.H6("Color Palette"),
                dbc.Select(
                    id="select-palette",
                    options=[
                        {"label": name, "value": name} for name in PALETTES
                    ],
                    value="Classic",
                    className="mb-3",
                ),
                # -- Export buttons --
                html.Hr(),
                html.H6("Export"),
                dbc.ButtonGroup(
                    [
                        dbc.Button(
                            "Export PNG",
                            id="btn-export-png",
                            color="secondary",
                            outline=True,
                            n_clicks=0,
                        ),
                        dbc.Button(
                            "Export CSV",
                            id="btn-export-csv",
                            color="secondary",
                            outline=True,
                            n_clicks=0,
                        ),
                    ],
                    className="w-100",
                ),
                dcc.Download(id="download-png"),
                dcc.Download(id="download-csv"),
            ]
        ),
        className="shadow-sm",
    )


def _warning_banner() -> html.Div:
    """Placeholder for the curve-fit warning banner."""
    return html.Div(
        id="warning-banner",
        className="mb-2",
    )


# ---------------------------------------------------------------------------
# Full layout
# ---------------------------------------------------------------------------

app.layout = dbc.Container(
    [
        # -- Stores for session state --
        dcc.Store(id="store-theme", data="light"),
        dcc.Store(id="store-palette", data="Classic"),
        dcc.Store(id="store-db-mtime", data=0),
        dcc.Store(id="store-selected-point", data=None),
        dcc.Interval(
            id="interval-db-poll",
            interval=5000,  # 5 seconds, synced with DB_POLL_INTERVAL_MS
            n_intervals=0,
        ),
        # -- Navbar --
        _navbar(),
        # -- Warning banner --
        _warning_banner(),
        # -- Stats cards --
        _stats_cards(),
        # -- Main content --
        dbc.Row(
            [
                dbc.Col(
                    [
                        dcc.Graph(id="graph-weight", config={"displayModeBar": True}),
                        dcc.Graph(id="graph-derivative", config={"displayModeBar": True}),
                        dcc.Graph(id="graph-residuals", config={"displayModeBar": True}),
                    ],
                    md=9,
                ),
                dbc.Col(
                    _controls_sidebar(),
                    md=3,
                ),
            ],
            className="g-3",
        ),
        # -- Footer --
        html.Hr(),
        html.P(
            "Weight Tracker — Interactive body weight analysis",
            className="text-center text-muted small",
        ),
    ],
    fluid=True,
)

# ---------------------------------------------------------------------------
# Register callbacks
# ---------------------------------------------------------------------------

register_callbacks(app, engine)

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=8050)
