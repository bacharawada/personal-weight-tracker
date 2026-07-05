"""Visualization package — chart data builders.

These functions are UI-agnostic: they shape a DataFrame into JSON-ready data
series. All rendering (colours, theme, layout) lives in the frontend.

Re-exports all public symbols for convenient imports::

    from viz import build_weight_chart_data
"""

from __future__ import annotations

from viz.charts import (
    build_derivative_chart_data,
    build_residuals_chart_data,
    build_weight_chart_data,
)

__all__ = [
    "build_derivative_chart_data",
    "build_residuals_chart_data",
    "build_weight_chart_data",
]
