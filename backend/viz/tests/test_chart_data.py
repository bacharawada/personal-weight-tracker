"""Tests for the visualization package (``viz``).

Each test verifies that a chart-data builder returns a JSON-ready ``dict`` of
plain data series with the expected shape, keys and values. No rendering
concerns (colours, theme, layout) are involved — the frontend owns those.
"""

from __future__ import annotations

import datetime
import math

import pandas as pd

from analysis import MODEL_EXP, MODEL_LINEAR, ModelCurve, build_model_curve
from viz import (
    build_derivative_chart_data,
    build_residuals_chart_data,
    build_weight_chart_data,
)


def _assert_points(points: list[dict]) -> None:
    """Assert every point has an ISO-able date and a finite float value."""
    for point in points:
        assert isinstance(point["date"], datetime.date)
        assert isinstance(point["value"], float)
        assert math.isfinite(point["value"])


# -----------------------------------------------------------------------
# Weight chart data
# -----------------------------------------------------------------------


class TestBuildWeightChartData:
    """Tests for ``build_weight_chart_data()``."""

    def test_returns_expected_keys(self, sample_df: pd.DataFrame) -> None:
        """The payload exposes all the keys the frontend expects."""
        data = build_weight_chart_data(sample_df)
        assert set(data) == {
            "raw",
            "smoothed",
            "smoothing_window",
            "models",
            "zones",
            "goal_weight",
        }

    def test_raw_series_matches_input(self, sample_df: pd.DataFrame) -> None:
        """Every measurement becomes one raw point with finite values."""
        data = build_weight_chart_data(sample_df)
        assert len(data["raw"]) == len(sample_df)
        _assert_points(data["raw"])

    def test_rolling_mean_present(self, sample_df: pd.DataFrame) -> None:
        """The smoothed series is populated and finite."""
        data = build_weight_chart_data(sample_df, smoothing_window=5)
        assert data["smoothing_window"] == 5
        assert len(data["smoothed"]) > 0
        _assert_points(data["smoothed"])

    def test_with_exp_curve(self, sample_df: pd.DataFrame) -> None:
        """An exp curve becomes a model series with a fit and decay label."""
        curve = build_model_curve(sample_df, MODEL_EXP, extrapolation_days=0)
        data = build_weight_chart_data(sample_df, model_curves=[curve])
        assert len(data["models"]) == 1
        model = data["models"][0]
        assert model["id"] == MODEL_EXP
        assert "decay" in model["label"].lower()
        assert len(model["fit"]) > 0
        _assert_points(model["fit"])

    def test_two_curves(self, sample_df: pd.DataFrame) -> None:
        """Overlaying both models yields two model series."""
        curves = [
            build_model_curve(sample_df, MODEL_EXP, extrapolation_days=60),
            build_model_curve(sample_df, MODEL_LINEAR, extrapolation_days=60),
        ]
        data = build_weight_chart_data(sample_df, model_curves=curves)
        ids = {m["id"] for m in data["models"]}
        assert ids == {MODEL_EXP, MODEL_LINEAR}

    def test_band_present_only_when_shown(self, sample_df: pd.DataFrame) -> None:
        """The uncertainty band is populated only when requested."""
        curve = build_model_curve(
            sample_df, MODEL_EXP, extrapolation_days=60, with_band=True
        )
        with_band = build_weight_chart_data(
            sample_df, model_curves=[curve], show_band=True
        )
        without_band = build_weight_chart_data(
            sample_df, model_curves=[curve], show_band=False
        )
        assert len(with_band["models"][0]["band"]) > 0
        assert without_band["models"][0]["band"] == []

    def test_projection_present_with_horizon(self, sample_df: pd.DataFrame) -> None:
        """A positive horizon yields projection points."""
        curve = build_model_curve(sample_df, MODEL_EXP, extrapolation_days=60)
        data = build_weight_chart_data(sample_df, model_curves=[curve])
        assert len(data["models"][0]["projection"]) > 0

    def test_model_diagnostics_serialised(self, sample_df: pd.DataFrame) -> None:
        """Each model series carries a JSON-ready diagnostics dict."""
        curves = [
            build_model_curve(sample_df, MODEL_EXP, extrapolation_days=0),
            build_model_curve(sample_df, MODEL_LINEAR, extrapolation_days=0),
        ]
        data = build_weight_chart_data(sample_df, model_curves=curves)
        by_id = {m["id"]: m["diagnostics"] for m in data["models"]}

        exp_diag = by_id[MODEL_EXP]
        assert exp_diag is not None
        assert exp_diag["n_points"] == len(sample_df)
        assert math.isfinite(exp_diag["c"])
        assert math.isfinite(exp_diag["half_life_days"])
        assert exp_diag["slope_per_week"] is None

        lin_diag = by_id[MODEL_LINEAR]
        assert lin_diag is not None
        assert math.isfinite(lin_diag["slope_per_week"])
        assert lin_diag["window_days"] > 0
        assert isinstance(lin_diag["used_fallback"], bool)
        assert lin_diag["half_life_days"] is None

    def test_goal_weight_passthrough(self, sample_df: pd.DataFrame) -> None:
        """The goal weight is echoed back into the payload."""
        data = build_weight_chart_data(sample_df, goal_weight=160.0)
        assert data["goal_weight"] == 160.0

    def test_zones_are_valid(self, sample_df: pd.DataFrame) -> None:
        """Deviation zones (if any) have valid kinds and ordered dates."""
        curve = build_model_curve(sample_df, MODEL_EXP, extrapolation_days=0)
        data = build_weight_chart_data(sample_df, model_curves=[curve])
        assert isinstance(data["zones"], list)
        for zone in data["zones"]:
            assert zone["kind"] in ("plateau", "acceleration")
            assert zone["start"] <= zone["end"]

    def test_empty_df(self) -> None:
        """An empty DataFrame yields empty series, not an error."""
        df = pd.DataFrame(columns=["date", "weight"])
        data = build_weight_chart_data(df)
        assert data["raw"] == []
        assert data["smoothed"] == []
        assert data["models"] == []


# -----------------------------------------------------------------------
# Derivative chart data
# -----------------------------------------------------------------------


class TestBuildDerivativeChartData:
    """Tests for ``build_derivative_chart_data()``."""

    def test_returns_expected_keys(self, sample_df: pd.DataFrame) -> None:
        """The payload exposes ``bars`` and ``smoothed``."""
        data = build_derivative_chart_data(sample_df)
        assert set(data) == {"bars", "smoothed"}

    def test_first_rate_dropped(self, sample_df: pd.DataFrame) -> None:
        """The first measurement has no defined rate, so it is omitted."""
        data = build_derivative_chart_data(sample_df)
        assert len(data["bars"]) == len(sample_df) - 1
        for bar in data["bars"]:
            assert isinstance(bar["date"], datetime.date)
            assert math.isfinite(bar["rate"])

    def test_empty_df(self) -> None:
        """An empty DataFrame yields empty series."""
        df = pd.DataFrame(columns=["date", "weight"])
        data = build_derivative_chart_data(df)
        assert data == {"bars": [], "smoothed": []}

    def test_single_row(self) -> None:
        """A single measurement has no derivative."""
        df = pd.DataFrame({"date": [pd.Timestamp("2025-06-01")], "weight": [180.0]})
        data = build_derivative_chart_data(df)
        assert data == {"bars": [], "smoothed": []}


# -----------------------------------------------------------------------
# Residuals chart data
# -----------------------------------------------------------------------


class TestBuildResidualsChartData:
    """Tests for ``build_residuals_chart_data()``."""

    def test_single_model(self, sample_df: pd.DataFrame) -> None:
        """One model yields one residual series aligned with the data."""
        curve = build_model_curve(sample_df, MODEL_EXP)
        data = build_residuals_chart_data(sample_df, model_curves=[curve])
        assert len(data["series"]) == 1
        series = data["series"][0]
        assert series["id"] == MODEL_EXP
        assert "residuals" in series["label"].lower()
        assert len(series["points"]) == len(sample_df)
        _assert_points(series["points"])
        assert data["sigma"] >= 0.0

    def test_no_curve(self, sample_df: pd.DataFrame) -> None:
        """No model yields an empty payload."""
        data = build_residuals_chart_data(sample_df, model_curves=None)
        assert data == {"series": [], "sigma": 0.0}

    def test_two_models(self, sample_df: pd.DataFrame) -> None:
        """Each successful model contributes its own residual series."""
        curves = [
            build_model_curve(sample_df, MODEL_EXP),
            build_model_curve(sample_df, MODEL_LINEAR),
        ]
        data = build_residuals_chart_data(sample_df, model_curves=curves)
        assert len(data["series"]) == 2

    def test_failed_curve(self, sample_df: pd.DataFrame) -> None:
        """A failed curve is skipped, not rendered."""
        bad_curve = ModelCurve(kind=MODEL_EXP, success=False)
        data = build_residuals_chart_data(sample_df, model_curves=[bad_curve])
        assert data == {"series": [], "sigma": 0.0}
