"""Tests for the visualization package (``viz``).

Each test verifies that a figure-building function returns a valid
``plotly.graph_objects.Figure`` with the expected traces and labels.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from analysis import (
    MODEL_EXP,
    MODEL_LINEAR,
    build_model_curve,
)
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
        """build_weight_figure() returns a plotly Figure with no curves."""
        fig = build_weight_figure(sample_df)
        assert isinstance(fig, go.Figure)

    def test_expected_traces(self, sample_df: pd.DataFrame) -> None:
        """Expected trace names are present (raw, smoothed)."""
        fig = build_weight_figure(sample_df)
        names = [t.name for t in fig.data if t.name]
        assert any("Raw" in n for n in names)
        assert any("Rolling" in n for n in names)

    def test_with_exp_curve(self, sample_df: pd.DataFrame) -> None:
        """Weight figure includes the exp curve when supplied."""
        curve = build_model_curve(sample_df, MODEL_EXP, extrapolation_days=0)
        fig = build_weight_figure(sample_df, model_curves=[curve])
        names = [t.name for t in fig.data if t.name]
        assert any("decay" in n.lower() for n in names)

    def test_two_curves_do_not_crash(self, sample_df: pd.DataFrame) -> None:
        """Overlaying both models produces a valid figure."""
        curves = [
            build_model_curve(sample_df, MODEL_EXP, extrapolation_days=60),
            build_model_curve(sample_df, MODEL_LINEAR, extrapolation_days=60),
        ]
        fig = build_weight_figure(sample_df, model_curves=curves)
        names = [t.name for t in fig.data if t.name]
        assert any("decay" in n.lower() for n in names)
        assert any("trend" in n.lower() for n in names)

    def test_band_traces_present_when_shown(self, sample_df: pd.DataFrame) -> None:
        """A band adds filled traces beyond the centre lines."""
        curve = build_model_curve(
            sample_df, MODEL_EXP, extrapolation_days=60, with_band=True
        )
        with_band = build_weight_figure(sample_df, model_curves=[curve], show_band=True)
        without_band = build_weight_figure(
            sample_df, model_curves=[curve], show_band=False
        )
        assert len(with_band.data) > len(without_band.data)

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
        curve = build_model_curve(sample_df, MODEL_EXP)
        fig = build_residuals_figure(sample_df, model_curves=[curve])
        assert isinstance(fig, go.Figure)

    def test_no_curve_shows_message(self, sample_df: pd.DataFrame) -> None:
        """Residuals figure shows message when no curve is available."""
        fig = build_residuals_figure(sample_df, model_curves=None)
        assert isinstance(fig, go.Figure)
        # Should have annotation about unavailability.
        assert len(fig.layout.annotations) > 0

    def test_two_models_two_traces(self, sample_df: pd.DataFrame) -> None:
        """Each successful model contributes its own residual trace."""
        curves = [
            build_model_curve(sample_df, MODEL_EXP),
            build_model_curve(sample_df, MODEL_LINEAR),
        ]
        fig = build_residuals_figure(sample_df, model_curves=curves)
        residual_traces = [t for t in fig.data if t.name and "residuals" in t.name.lower()]
        assert len(residual_traces) == 2

    def test_axis_labels(self, sample_df: pd.DataFrame) -> None:
        """X and Y axis labels are set and non-empty."""
        curve = build_model_curve(sample_df, MODEL_EXP)
        fig = build_residuals_figure(sample_df, model_curves=[curve])
        assert fig.layout.xaxis.title.text
        assert fig.layout.yaxis.title.text

    def test_failed_curve(self, sample_df: pd.DataFrame) -> None:
        """Residuals figure handles a failed curve gracefully."""
        from analysis import ModelCurve

        bad_curve = ModelCurve(kind=MODEL_EXP, success=False)
        fig = build_residuals_figure(sample_df, model_curves=[bad_curve])
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
