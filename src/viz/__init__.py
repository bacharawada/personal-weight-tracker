"""Visualization package — Plotly figure builders and colour palettes.

Re-exports all public symbols for convenient imports::

    from viz import build_weight_figure, PALETTES, PaletteConfig
"""

from __future__ import annotations

from viz.charts import (
    build_derivative_figure,
    build_residuals_figure,
    build_weight_figure,
)
from viz.palettes import PALETTES, PaletteConfig

__all__ = [
    "PALETTES",
    "PaletteConfig",
    "build_derivative_figure",
    "build_residuals_figure",
    "build_weight_figure",
]
