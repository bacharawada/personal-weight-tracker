"""Tests for the visualization package (``viz``).

Each test verifies that a figure-building function returns a valid
``plotly.graph_objects.Figure`` with the expected traces and labels.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from analysis import FitResult, fit_exponential_decay
from viz import (
    PALETTES,
    PaletteConfig,
    build_derivative_figure,
    build_residuals_figure,
    build_weight_figure,
)

# -----------------------------------------------------------------------
# Weight figure
# -----------------------------------------------------------------------


class TestBuildWeightFigure:
    """Tests for ``build_weight_figure()``."""

    def test_returns_figure(self, sample_df: pd.DataFrame) -> None:
        """build_weight_figure() returns a plotly Figure."""
        fig = build_weight_figure(sample_df)
        assert isinstance(fig, go.Figure)

    def test_expected_traces(self, sample_df: pd.DataFrame) -> None:
        """Expected trace names are present (raw, smoothed)."""
        fig = build_weight_figure(sample_df)
        names = [t.name for t in fig.data if t.name]
        assert any("Raw" in n for n in names)
        assert any("Rolling" in n for n in names)

    def test_with_fit(self, sample_df: pd.DataFrame) -> None:
        """Weight figure includes fit trace when fit succeeds."""
        fit_result = fit_exponential_decay(sample_df)
        fig = build_weight_figure(sample_df, fit_result=fit_result)
        names = [t.name for t in fig.data if t.name]
        assert any("Exp" in n for n in names)

    def test_with_extrapolation(self, sample_df: pd.DataFrame) -> None:
        """Weight figure includes extrapolation trace."""
        fit_result = fit_exponential_decay(sample_df)
        fig = build_weight_figure(
            sample_df, fit_result=fit_result, extrapolation_days=90
        )
        names = [t.name for t in fig.data if t.name]
        assert any("Extrapol" in n for n in names)

    def test_axis_labels(self, sample_df: pd.DataFrame) -> None:
        """X and Y axis labels are set and non-empty."""
        fig = build_weight_figure(sample_df)
        assert fig.layout.xaxis.title.text
        assert fig.layout.yaxis.title.text

    def test_empty_df(self) -> None:
        """Weight figure handles empty DataFrame gracefully."""
        df = pd.DataFrame(columns=["date", "weight"])
        fig = build_weight_figure(df)
        assert isinstance(fig, go.Figure)

    def test_dark_mode(self, sample_df: pd.DataFrame) -> None:
        """Dark mode uses the plotly_dark template."""
        fig = build_weight_figure(sample_df, dark=True)
        # The template should be set (not None) when dark mode is active.
        assert fig.layout.template is not None

    def test_all_palettes(self, sample_df: pd.DataFrame) -> None:
        """build_weight_figure() works with every palette."""
        for name, palette in PALETTES.items():
            fig = build_weight_figure(sample_df, palette=palette)
            assert isinstance(fig, go.Figure), f"Failed with palette {name}"


# -----------------------------------------------------------------------
# Derivative figure
# -----------------------------------------------------------------------


class TestBuildDerivativeFigure:
    """Tests for ``build_derivative_figure()``."""

    def test_returns_figure(self, sample_df: pd.DataFrame) -> None:
        """build_derivative_figure() returns a plotly Figure."""
        fig = build_derivative_figure(sample_df)
        assert isinstance(fig, go.Figure)

    def test_expected_traces(self, sample_df: pd.DataFrame) -> None:
        """Expected trace names are present."""
        fig = build_derivative_figure(sample_df)
        names = [t.name for t in fig.data if t.name]
        assert any("Rate" in n for n in names)
        assert any("Smooth" in n for n in names)

    def test_axis_labels(self, sample_df: pd.DataFrame) -> None:
        """X and Y axis labels are set and non-empty."""
        fig = build_derivative_figure(sample_df)
        assert fig.layout.xaxis.title.text
        assert fig.layout.yaxis.title.text

    def test_empty_df(self) -> None:
        """Derivative figure handles empty DataFrame gracefully."""
        df = pd.DataFrame(columns=["date", "weight"])
        fig = build_derivative_figure(df)
        assert isinstance(fig, go.Figure)


# -----------------------------------------------------------------------
# Residuals figure
# -----------------------------------------------------------------------


class TestBuildResidualsFigure:
    """Tests for ``build_residuals_figure()``."""

    def test_returns_figure(self, sample_df: pd.DataFrame) -> None:
        """build_residuals_figure() returns a plotly Figure."""
        fit_result = fit_exponential_decay(sample_df)
        fig = build_residuals_figure(sample_df, fit_result=fit_result)
        assert isinstance(fig, go.Figure)

    def test_no_fit_shows_message(self, sample_df: pd.DataFrame) -> None:
        """Residuals figure shows message when no fit is available."""
        fig = build_residuals_figure(sample_df, fit_result=None)
        assert isinstance(fig, go.Figure)
        # Should have annotation about unavailability.
        assert len(fig.layout.annotations) > 0

    def test_axis_labels(self, sample_df: pd.DataFrame) -> None:
        """X and Y axis labels are set and non-empty."""
        fit_result = fit_exponential_decay(sample_df)
        fig = build_residuals_figure(sample_df, fit_result=fit_result)
        assert fig.layout.xaxis.title.text
        assert fig.layout.yaxis.title.text

    def test_failed_fit(self, sample_df: pd.DataFrame) -> None:
        """Residuals figure handles failed fit gracefully."""
        bad_result = FitResult(success=False)
        fig = build_residuals_figure(sample_df, fit_result=bad_result)
        assert isinstance(fig, go.Figure)


# -----------------------------------------------------------------------
# Palette registry
# -----------------------------------------------------------------------


class TestPalettes:
    """Tests for the palette registry."""

    def test_five_palettes_exist(self) -> None:
        """At least five named palettes are registered."""
        assert len(PALETTES) >= 5

    def test_palettes_are_dataclasses(self) -> None:
        """Every palette is a PaletteConfig instance."""
        for name, palette in PALETTES.items():
            assert isinstance(palette, PaletteConfig), f"{name} is not PaletteConfig"

    def test_required_palette_names(self) -> None:
        """The five required palette names are present."""
        required = {"Classic", "Teal", "Warm", "Monochrome", "Forest"}
        assert required.issubset(set(PALETTES.keys()))
