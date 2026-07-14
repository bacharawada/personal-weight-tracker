"""Tests for the analysis package (``analysis``).

All tests use deterministic sample data — no database interaction.
"""

from __future__ import annotations

import datetime
import math

import numpy as np
import pandas as pd
import pytest

from analysis import (
    ENERGY_DENSITY_KCAL_PER_KG,
    MODEL_EXP,
    MODEL_LINEAR,
    AnalysisConfig,
    FitResult,
    PlateauConfig,
    TrendConfig,
    build_model_curve,
    compare_trend_around,
    compute_derivative,
    compute_plateau_status,
    compute_rolling_mean,
    compute_summary_stats,
    detect_deviations,
    detect_dose_changes,
    energy_series,
    estimate_energy_balance,
    exp_decay,
    exp_decay_band,
    extrapolate_fit,
    fit_exponential_decay,
    fit_recent_trend,
    project_goal,
    project_milestones,
    trend_curve,
)

# -----------------------------------------------------------------------
# Rolling mean
# -----------------------------------------------------------------------


class TestRollingMean:
    """Tests for ``compute_rolling_mean()``."""

    def test_same_length_as_input(self, sample_df: pd.DataFrame) -> None:
        """Output has the same length as input."""
        result = compute_rolling_mean(sample_df, window=5)
        assert len(result) == len(sample_df)

    def test_nans_only_at_edges(self, sample_df: pd.DataFrame) -> None:
        """NaN values only appear at the edges of the series."""
        result = compute_rolling_mean(sample_df, window=5)
        # With min_periods=2, only the very first element can be NaN.
        # The interior should be non-NaN.
        interior = result.iloc[2:-2]
        assert not interior.isna().any()

    def test_different_windows(self, sample_df: pd.DataFrame) -> None:
        """Rolling mean works with different window sizes."""
        for w in [3, 5, 7, 10]:
            result = compute_rolling_mean(sample_df, window=w)
            assert len(result) == len(sample_df)


# -----------------------------------------------------------------------
# Derivative
# -----------------------------------------------------------------------


class TestDerivative:
    """Tests for ``compute_derivative()``."""

    def test_known_values(self) -> None:
        """Derivative is correct on a hand-crafted input."""
        # 7-day interval, -1 kg each step -> -1 kg/week exactly.
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=4, freq="7D"),
                "weight": [100.0, 99.0, 98.0, 97.0],
            }
        )
        result = compute_derivative(df)
        # Skip the first row (NaN due to diff).
        deriv = result["deriv_kgweek"].iloc[1:].values
        np.testing.assert_allclose(deriv, [-1.0, -1.0, -1.0], atol=1e-10)

    def test_adds_required_columns(self, sample_df: pd.DataFrame) -> None:
        """compute_derivative() adds days, deriv_kgweek, deriv_smooth."""
        result = compute_derivative(sample_df)
        for col in ["days", "deriv_kgweek", "deriv_smooth"]:
            assert col in result.columns

    def test_first_row_is_nan(self, sample_df: pd.DataFrame) -> None:
        """The first derivative value is NaN (no previous point)."""
        result = compute_derivative(sample_df)
        assert pd.isna(result["deriv_kgweek"].iloc[0])


# -----------------------------------------------------------------------
# Exponential decay fit
# -----------------------------------------------------------------------


class TestFitExponentialDecay:
    """Tests for ``fit_exponential_decay()``."""

    def test_converges_on_sample(self, sample_df: pd.DataFrame) -> None:
        """Fit converges on the sample dataset."""
        result = fit_exponential_decay(sample_df)
        assert result.success
        assert all(np.isfinite(p) for p in result.params)

    def test_residuals_sum_near_zero(self, sample_df: pd.DataFrame) -> None:
        """Residuals sum to approximately zero on a well-fitted dataset."""
        result = fit_exponential_decay(sample_df)
        assert result.success
        assert abs(result.residuals.sum()) < 5.0  # Tolerance for small dataset.

    def test_too_few_points_fails_gracefully(self) -> None:
        """Fit fails gracefully with fewer than 3 data points."""
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=2, freq="7D"),
                "weight": [100.0, 99.0],
            }
        )
        result = fit_exponential_decay(df)
        assert not result.success
        assert "Not enough" in result.error_message

    def test_flat_data_fails_gracefully(self) -> None:
        """Fit fails or degrades gracefully on flat (constant) data."""
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=10, freq="7D"),
                "weight": [75.0] * 10,
            }
        )
        result = fit_exponential_decay(df)
        # The fit may technically succeed with b~0, or it may fail.
        # Either way, no exception should escape.
        assert isinstance(result, FitResult)

    def test_exp_decay_function(self) -> None:
        """exp_decay() returns correct values for known inputs."""
        t = np.array([0.0, 100.0, 1000.0])
        result = exp_decay(t, a=30.0, b=0.003, c=150.0)
        expected = 30.0 * np.exp(-0.003 * t) + 150.0
        np.testing.assert_allclose(result, expected)


# -----------------------------------------------------------------------
# Extrapolation
# -----------------------------------------------------------------------


class TestExtrapolation:
    """Tests for ``extrapolate_fit()``."""

    def test_extrapolation_produces_values(
        self, sample_df: pd.DataFrame
    ) -> None:
        """Extrapolation returns non-empty arrays for a successful fit."""
        import datetime

        result = fit_exponential_decay(sample_df)
        assert result.success
        x, y = extrapolate_fit(
            result,
            last_date=datetime.date(2025, 10, 15),
            first_date=datetime.date(2025, 6, 1),
            horizon_days=90,
        )
        assert len(x) > 0
        assert len(y) > 0

    def test_extrapolation_failed_fit(self) -> None:
        """Extrapolation returns empty arrays for a failed fit."""
        import datetime

        result = FitResult(success=False)
        x, y = extrapolate_fit(
            result,
            last_date=datetime.date(2025, 10, 15),
            first_date=datetime.date(2025, 6, 1),
            horizon_days=90,
        )
        assert len(x) == 0
        assert len(y) == 0


# -----------------------------------------------------------------------
# Deviation detection
# -----------------------------------------------------------------------


class TestDeviationDetection:
    """Tests for ``detect_deviations()``."""

    def test_adds_boolean_columns(self, sample_df: pd.DataFrame) -> None:
        """detect_deviations() adds plateau and accel columns."""
        result = fit_exponential_decay(sample_df)
        dev = detect_deviations(sample_df, result)
        assert "plateau" in dev.columns
        assert "accel" in dev.columns

    def test_failed_fit_produces_false(self, sample_df: pd.DataFrame) -> None:
        """When fit fails, plateau and accel are all False."""
        bad_result = FitResult(success=False)
        dev = detect_deviations(sample_df, bad_result)
        assert not dev["plateau"].any()
        assert not dev["accel"].any()


# -----------------------------------------------------------------------
# Summary statistics
# -----------------------------------------------------------------------


class TestSummaryStats:
    """Tests for ``compute_summary_stats()``."""

    def test_total_loss(self, sample_df: pd.DataFrame) -> None:
        """Total loss equals first weight minus last weight."""
        stats = compute_summary_stats(sample_df)
        expected = 183.5 - 167.0
        assert abs(stats.total_loss_kg - expected) < 0.01

    def test_days_tracked(self, sample_df: pd.DataFrame) -> None:
        """Days tracked is elapsed calendar days (first to last, inclusive)."""
        stats = compute_summary_stats(sample_df)
        assert stats.days_tracked == 127  # 10 rows × 14-day freq = 126 days + 1

    def test_empty_dataframe(self) -> None:
        """Stats for empty DataFrame return zero values."""
        df = pd.DataFrame(columns=["date", "weight"])
        stats = compute_summary_stats(df)
        assert stats.total_loss_kg == 0.0
        assert stats.days_tracked == 0
        assert stats.latest_weight is None

    def test_latest_weight(self, sample_df: pd.DataFrame) -> None:
        """Latest weight equals the most recent measurement."""
        stats = compute_summary_stats(sample_df)
        assert stats.latest_weight == 167.0


# -----------------------------------------------------------------------
# Goal projection
# -----------------------------------------------------------------------


class TestGoalProjection:
    """Tests for ``project_goal()`` (recency-weighted linear trend)."""

    def test_no_goal(self, sample_df: pd.DataFrame) -> None:
        """A ``None`` goal reports has_goal=False."""
        proj = project_goal(sample_df, goal_weight=None)
        assert proj.has_goal is False
        assert proj.reachable is None

    def test_empty_data(self) -> None:
        """No measurements yields an unknown projection."""
        df = pd.DataFrame(columns=["date", "weight"])
        proj = project_goal(df, goal_weight=70.0)
        assert proj.has_goal is True
        assert proj.predicted_date is None

    def test_already_reached(self, sample_df: pd.DataFrame) -> None:
        """A goal above the latest weight is already reached."""
        proj = project_goal(sample_df, goal_weight=200.0)
        assert proj.already_reached is True
        assert proj.reachable is True
        assert proj.days_remaining == 0

    def test_reachable_goal(self, sample_df: pd.DataFrame) -> None:
        """A goal within the horizon on a downward trend is reachable."""
        proj = project_goal(sample_df, goal_weight=160.0)
        assert proj.reachable is True
        assert proj.predicted_date is not None
        assert proj.days_remaining is not None and proj.days_remaining > 0
        assert proj.trend_per_week is not None and proj.trend_per_week < 0

    def test_too_far_beyond_horizon(self, sample_df: pd.DataFrame) -> None:
        """A goal more than ~2 years out is not reliably projectable.

        A linear trend has no floor, so rather than claim any low weight is
        reachable given enough time, the projection reports ``reachable=None``.
        """
        proj = project_goal(sample_df, goal_weight=40.0)
        assert proj.reachable is None
        assert proj.predicted_date is None
        assert "too far" in proj.reason.lower()

    def test_not_trending_down(self) -> None:
        """A flat trend below the goal is unreachable (no downward slope)."""
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-06-01", periods=8, freq="7D"),
                "weight": [80.0] * 8,
            }
        )
        proj = project_goal(df, goal_weight=70.0)
        assert proj.reachable is False
        assert proj.predicted_date is None

    def test_insufficient_data(self) -> None:
        """Fewer than three points yields an unknown projection (no crash)."""
        df = pd.DataFrame(
            {"date": pd.date_range("2025-06-01", periods=2, freq="7D"), "weight": [90.0, 89.0]}
        )
        proj = project_goal(df, goal_weight=80.0)
        assert proj.has_goal is True
        assert proj.reachable is None

    def test_date_range_ordered_for_noisy_data(self) -> None:
        """The optimistic/pessimistic bounds bracket the central estimate."""
        weights = [100.0, 99.2, 98.9, 98.0, 97.6, 96.7, 96.5, 95.6, 95.1, 94.2, 93.9, 93.0]
        df = pd.DataFrame(
            {"date": pd.date_range("2025-06-01", periods=len(weights), freq="7D"), "weight": weights}
        )
        proj = project_goal(df, goal_weight=88.0)
        assert proj.reachable is True
        assert proj.predicted_date is not None
        assert proj.predicted_date_optimistic is not None
        assert proj.predicted_date_optimistic <= proj.predicted_date
        if proj.predicted_date_pessimistic is not None:
            assert proj.predicted_date_pessimistic >= proj.predicted_date

    def test_on_track_vs_behind(self, sample_df: pd.DataFrame) -> None:
        """Target dates flip the on_track flag around the predicted date."""
        import datetime

        far = project_goal(
            sample_df, goal_weight=160.0, target_date=datetime.date(2030, 1, 1)
        )
        near = project_goal(
            sample_df, goal_weight=160.0, target_date=datetime.date(2025, 10, 16)
        )
        assert far.on_track is True
        assert near.on_track is False
        assert near.days_ahead_behind is not None and near.days_ahead_behind > 0


# -----------------------------------------------------------------------
# Goal milestones
# -----------------------------------------------------------------------


class TestGoalMilestones:
    """Tests for ``project_milestones()``."""

    def test_no_goal(self, sample_df: pd.DataFrame) -> None:
        """A ``None`` goal reports has_goal=False and no milestones."""
        result = project_milestones(sample_df, goal_weight=None)
        assert result["has_goal"] is False
        assert result["milestones"] == []
        assert result["next_milestone"] is None
        assert "no goal" in result["reason"].lower()

    def test_empty_data(self) -> None:
        """No measurements yields an empty projection (no crash)."""
        df = pd.DataFrame(columns=["date", "weight"])
        result = project_milestones(df, goal_weight=70.0)
        assert result["has_goal"] is True
        assert result["milestones"] == []
        assert "measurements" in result["reason"].lower()

    def test_goal_above_start_weight(self, sample_df: pd.DataFrame) -> None:
        """A goal at or above the starting weight cannot be milestoned."""
        result = project_milestones(sample_df, goal_weight=200.0)
        assert result["has_goal"] is True
        assert result["milestones"] == []
        assert result["next_milestone"] is None
        assert "starting weight" in result["reason"].lower()

    def test_goal_equal_to_start_weight(self, sample_df: pd.DataFrame) -> None:
        """A goal exactly equal to the starting weight also degrades gracefully."""
        start_weight = float(sample_df["weight"].iloc[0])
        result = project_milestones(sample_df, goal_weight=start_weight)
        assert result["has_goal"] is True
        assert result["milestones"] == []

    def test_nominal_progress(self, sample_df: pd.DataFrame) -> None:
        """A goal partway reached yields a mix of achieved/unachieved milestones."""
        result = project_milestones(sample_df, goal_weight=150.0)

        assert result["has_goal"] is True
        assert result["start_weight"] == 183.5
        assert result["goal_weight"] == 150.0
        assert len(result["milestones"]) == 10

        # Milestones are equally spaced and the last one equals the goal.
        assert result["milestones"][-1]["target_weight"] == 150.0
        assert result["milestones"][0]["target_weight"] > result["milestones"][1]["target_weight"]

        assert result["current_milestone_index"] == 4
        assert result["remaining_milestones"] == 6
        achieved_flags = [m["achieved"] for m in result["milestones"]]
        assert achieved_flags == [True, True, True, True, False, False, False, False, False, False]
        assert all(m["achieved_date"] is not None for m in result["milestones"][:4])
        assert all(m["achieved_date"] is None for m in result["milestones"][4:])

        next_milestone = result["next_milestone"]
        assert next_milestone is not None
        assert next_milestone["index"] == 5
        assert next_milestone["target_weight"] == pytest.approx(166.75)
        assert next_milestone["kg_remaining"] == pytest.approx(0.25)

        expected_percent = (183.5 - 167.0) / (183.5 - 150.0) * 100.0
        assert result["percent_complete"] == pytest.approx(expected_percent, abs=0.1)

    def test_goal_already_reached(self, sample_df: pd.DataFrame) -> None:
        """When the latest weight is already at/below the goal, all milestones
        are achieved and percent_complete is clamped to 100."""
        result = project_milestones(sample_df, goal_weight=170.0)

        assert result["current_milestone_index"] == 10
        assert result["remaining_milestones"] == 0
        assert result["next_milestone"] is None
        assert all(m["achieved"] for m in result["milestones"])
        assert result["percent_complete"] == 100.0
        assert "achieved" in result["reason"].lower()

    def test_custom_milestone_count(self, sample_df: pd.DataFrame) -> None:
        """A custom ``n`` produces exactly ``n`` equally-spaced milestones."""
        result = project_milestones(sample_df, goal_weight=150.0, n=5)
        assert len(result["milestones"]) == 5
        assert [m["index"] for m in result["milestones"]] == [1, 2, 3, 4, 5]
        assert result["milestones"][-1]["target_weight"] == 150.0

    def test_kg_remaining_never_negative(self, sample_df: pd.DataFrame) -> None:
        """kg_remaining is floored at 0 even if the latest weight briefly dipped
        below the next milestone and bounced back above it."""
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-06-01", periods=4, freq="7D"),
                "weight": [100.0, 90.0, 95.0, 96.0],
            }
        )
        result = project_milestones(df, goal_weight=80.0)
        next_milestone = result["next_milestone"]
        if next_milestone is not None:
            assert next_milestone["kg_remaining"] >= 0.0


# -----------------------------------------------------------------------
# Hardened exponential fit (bounds, recency, covariance, band)
# -----------------------------------------------------------------------


class TestHardenedExpFit:
    """Tests for the bounded, recency-weighted exponential fit."""

    def test_params_within_bounds(self, sample_df: pd.DataFrame) -> None:
        """Fitted parameters stay inside the configured bounds."""
        config = AnalysisConfig()
        result = fit_exponential_decay(sample_df, config)
        assert result.success
        lower, upper = config.fit_bounds
        for value, lo, hi in zip(result.params, lower, upper, strict=True):
            assert lo <= value <= hi

    def test_covariance_populated(self, sample_df: pd.DataFrame) -> None:
        """A successful fit exposes a finite covariance and per-param std."""
        result = fit_exponential_decay(sample_df)
        assert result.success
        assert result.pcov.shape == (3, 3)
        assert np.all(np.isfinite(result.pcov))
        assert result.param_std is not None
        assert all(s >= 0 for s in result.param_std)

    def test_recency_weighting_changes_fit(self, sample_df: pd.DataFrame) -> None:
        """Disabling recency weighting yields different parameters."""
        weighted = fit_exponential_decay(sample_df, AnalysisConfig(recency_halflife_days=20.0))
        equal = fit_exponential_decay(sample_df, AnalysisConfig(recency_halflife_days=None))
        assert weighted.success and equal.success
        assert weighted.params != equal.params

    def test_warning_on_non_decaying_series(self) -> None:
        """A flat series sets a warning but still succeeds gracefully."""
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=12, freq="7D"),
                "weight": [80.0] * 12,
            }
        )
        result = fit_exponential_decay(df)
        if result.success:
            assert result.warning != ""

    def test_band_ordered(self, sample_df: pd.DataFrame) -> None:
        """The Monte-Carlo band has y_low <= y_high everywhere."""
        result = fit_exponential_decay(sample_df)
        assert result.success
        x = np.linspace(0.0, 200.0, 50)
        y_low, y_high = exp_decay_band(x, result.params, result.pcov)
        assert len(y_low) == len(x)
        assert np.all(y_low <= y_high)

    def test_band_empty_on_bad_pcov(self, sample_df: pd.DataFrame) -> None:
        """A non-finite covariance yields empty band arrays."""
        x = np.linspace(0.0, 100.0, 10)
        bad = np.full((3, 3), np.nan)
        y_low, y_high = exp_decay_band(x, (30.0, 0.003, 150.0), bad)
        assert len(y_low) == 0
        assert len(y_high) == 0


# -----------------------------------------------------------------------
# Linear trend curve
# -----------------------------------------------------------------------


class TestTrendCurve:
    """Tests for ``trend_curve()``."""

    def test_band_brackets_centre(self, sample_df: pd.DataFrame) -> None:
        """The slow/fast band brackets the centre line away from the anchor."""
        import datetime

        fit = fit_recent_trend(sample_df)
        assert fit.success
        x, y, y_low, y_high = trend_curve(
            fit,
            first_date=datetime.date(2025, 6, 1),
            last_date=datetime.date(2025, 10, 15),
            horizon_days=90,
        )
        assert len(x) > 0
        lo = np.minimum(y_low, y_high)
        hi = np.maximum(y_low, y_high)
        assert np.all(lo <= y + 1e-9)
        assert np.all(y <= hi + 1e-9)

    def test_failed_fit_returns_empty(self) -> None:
        """A failed trend fit produces empty arrays."""
        import datetime

        from analysis import TrendFit

        x, y, y_low, y_high = trend_curve(
            TrendFit(success=False),
            first_date=datetime.date(2025, 6, 1),
            last_date=datetime.date(2025, 10, 1),
            horizon_days=30,
        )
        assert len(x) == 0


# -----------------------------------------------------------------------
# Recent-window bookkeeping
# -----------------------------------------------------------------------


class TestRecentTrendWindow:
    """Tests for the window fields reported by ``fit_recent_trend()``."""

    def test_window_fields_populated(self, sample_df: pd.DataFrame) -> None:
        """A dense recent window reports the configured length, no fallback."""
        fit = fit_recent_trend(sample_df)
        assert fit.success
        assert fit.window_days == TrendConfig().window_days
        assert fit.used_fallback is False

    def test_fallback_when_window_sparse(self) -> None:
        """Too few points inside the window falls back to all data."""
        df = pd.DataFrame(
            {
                "date": pd.to_datetime(
                    ["2025-01-01", "2025-03-01", "2025-05-01", "2025-07-01"]
                ),
                "weight": [90.0, 88.0, 86.0, 84.0],
            }
        )
        fit = fit_recent_trend(df)
        assert fit.success
        assert fit.used_fallback is True
        assert fit.n_points == 4


# -----------------------------------------------------------------------
# Unified model abstraction
# -----------------------------------------------------------------------


class TestBuildModelCurve:
    """Tests for ``build_model_curve()``."""

    def test_exp_curve_with_band(self, sample_df: pd.DataFrame) -> None:
        """The exp model produces in-sample, extrapolation, and band arrays."""
        curve = build_model_curve(
            sample_df, MODEL_EXP, extrapolation_days=60, with_band=True
        )
        assert curve.success
        assert curve.kind == MODEL_EXP
        assert len(curve.x_fit) > 0
        assert len(curve.x_extra) > 0
        assert len(curve.y_extra_low) == len(curve.x_extra)
        assert curve.hline_y is not None

    def test_linear_curve_with_band(self, sample_df: pd.DataFrame) -> None:
        """The linear model produces a curve, extrapolation, and band."""
        curve = build_model_curve(
            sample_df, MODEL_LINEAR, extrapolation_days=60, with_band=True
        )
        assert curve.success
        assert curve.kind == MODEL_LINEAR
        assert len(curve.x_fit) > 0
        assert len(curve.x_extra) > 0
        assert len(curve.y_extra_low) == len(curve.x_extra)
        assert curve.hline_y is None

    def test_band_absent_when_not_requested(self, sample_df: pd.DataFrame) -> None:
        """No band arrays are produced when with_band is False."""
        curve = build_model_curve(
            sample_df, MODEL_EXP, extrapolation_days=60, with_band=False
        )
        assert curve.success
        assert len(curve.y_extra_low) == 0

    def test_unknown_kind_fails_gracefully(self, sample_df: pd.DataFrame) -> None:
        """An unknown model kind returns a failed curve, no exception."""
        curve = build_model_curve(sample_df, "bogus")
        assert not curve.success
        assert "Unknown" in curve.error_message

    def test_exp_diagnostics(self, sample_df: pd.DataFrame) -> None:
        """The exp model exposes its fitted parameters and derived values."""
        curve = build_model_curve(sample_df, MODEL_EXP)
        assert curve.success
        diag = curve.diagnostics
        assert diag is not None
        assert diag.n_points == len(sample_df)
        assert diag.a is not None and diag.b is not None and diag.c is not None
        assert diag.half_life_days is not None
        assert math.isclose(diag.half_life_days, math.log(2.0) / diag.b)
        assert diag.current_rate_per_week is not None
        assert diag.current_rate_per_week < 0  # sample data trends down
        assert diag.slope_per_week is None  # linear-only field

    def test_linear_diagnostics(self, sample_df: pd.DataFrame) -> None:
        """The linear model exposes its slope, CI bounds, and window info."""
        curve = build_model_curve(sample_df, MODEL_LINEAR)
        assert curve.success
        diag = curve.diagnostics
        assert diag is not None
        assert diag.slope_per_week is not None and diag.slope_per_week < 0
        assert diag.slope_low_per_week is not None
        assert diag.slope_high_per_week is not None
        assert (
            diag.slope_low_per_week <= diag.slope_per_week <= diag.slope_high_per_week
        )
        assert diag.window_days == TrendConfig().window_days
        assert diag.used_fallback is False
        assert diag.half_life_days is None  # exp-only field

    def test_empty_df_fails_gracefully(self) -> None:
        """An empty DataFrame returns a failed curve without diagnostics."""
        df = pd.DataFrame(columns=["date", "weight"])
        curve = build_model_curve(df, MODEL_EXP)
        assert not curve.success
        assert curve.diagnostics is None


# -----------------------------------------------------------------------
# Plateau detection
# -----------------------------------------------------------------------


class TestPlateauStatus:
    """Tests for ``compute_plateau_status()``."""

    def test_plateau_detected(self) -> None:
        """A flat recent tail (>= 14 days, |slope| < 0.1 kg/week) is a plateau."""
        import datetime

        declining_dates = pd.date_range("2025-01-01", periods=5, freq="7D")
        declining_weights = [95.0, 93.0, 91.0, 89.5, 88.0]
        last_decline_date = declining_dates[-1]
        plateau_dates = pd.date_range(
            last_decline_date + pd.Timedelta(days=4), periods=6, freq="4D"
        )
        plateau_weights = [87.9, 88.1, 87.95, 88.05, 88.0, 87.9]
        df = pd.DataFrame(
            {
                "date": list(declining_dates) + list(plateau_dates),
                "weight": declining_weights + plateau_weights,
            }
        )

        status = compute_plateau_status(df)

        assert status["has_data"] is True
        assert status["state"] == "plateau"
        assert status["in_plateau"] is True
        assert status["trend_per_week"] is not None
        assert abs(status["trend_per_week"]) < 0.1
        assert status["since_date"] == datetime.date(2025, 2, 2)
        assert status["duration_days"] == 20
        assert "steady" in status["reason"].lower()

    def test_steady_loss_is_not_a_plateau(self, sample_df: pd.DataFrame) -> None:
        """A clear, steady downward trend is reported as 'losing', not a plateau."""
        status = compute_plateau_status(sample_df)

        assert status["has_data"] is True
        assert status["state"] == "losing"
        assert status["in_plateau"] is False
        assert status["trend_per_week"] is not None and status["trend_per_week"] < -0.1
        assert status["since_date"] is None
        assert status["duration_days"] is None

    def test_gaining(self) -> None:
        """A clear upward trend is reported as 'gaining'."""
        dates = pd.date_range("2025-01-01", periods=8, freq="4D")
        weights = [80.0, 80.3, 80.7, 81.0, 81.4, 81.8, 82.1, 82.5]
        df = pd.DataFrame({"date": dates, "weight": weights})

        status = compute_plateau_status(df)

        assert status["state"] == "gaining"
        assert status["in_plateau"] is False
        assert status["trend_per_week"] is not None and status["trend_per_week"] > 0.1

    def test_insufficient_data_degrades_gracefully(self) -> None:
        """Fewer than 3 points reports has_data=False with a populated reason."""
        dates = pd.date_range("2025-01-01", periods=2, freq="7D")
        df = pd.DataFrame({"date": dates, "weight": [90.0, 89.5]})

        status = compute_plateau_status(df)

        assert status["has_data"] is False
        assert status["state"] is None
        assert status["history"] == []
        assert status["reason"] != ""

    def test_empty_dataframe_degrades_gracefully(self) -> None:
        """An empty DataFrame never raises and reports has_data=False."""
        df = pd.DataFrame(columns=["date", "weight"])

        status = compute_plateau_status(df)

        assert status["has_data"] is False
        assert status["history"] == []
        assert status["history_available"] is False

    def test_failed_curve_fit_yields_empty_history_without_crashing(self) -> None:
        """When the exponential fit can't converge, history degrades to [] + warning.

        ``fit_exponential_decay`` only *guarantees* failure below 3 points
        (its one documented, deterministic failure mode — see
        ``TestFitExponentialDecay.test_too_few_points_fails_gracefully``).
        ``min_points_for_status`` is lowered here so the 2-point DataFrame
        still reaches ``_history()`` instead of short-circuiting on the
        top-level "not enough data" guard.
        """
        dates = pd.date_range("2025-01-01", periods=2, freq="7D")
        df = pd.DataFrame({"date": dates, "weight": [90.0, 89.5]})

        status = compute_plateau_status(df, PlateauConfig(min_points_for_status=2))

        assert status["has_data"] is True
        assert status["history"] == []
        assert status["avg_duration_days"] is None
        assert status["history_available"] is False
        assert status["warning"] != ""

    def test_history_zones_and_average_duration(self) -> None:
        """Consecutive above-curve points merge into dated zones with an average."""
        declining_dates = pd.date_range("2025-01-01", periods=5, freq="7D")
        declining_weights = [95.0, 93.0, 91.0, 89.5, 88.0]
        last_decline_date = declining_dates[-1]
        plateau_dates = pd.date_range(
            last_decline_date + pd.Timedelta(days=4), periods=6, freq="4D"
        )
        plateau_weights = [87.9, 88.1, 87.95, 88.05, 88.0, 87.9]
        df = pd.DataFrame(
            {
                "date": list(declining_dates) + list(plateau_dates),
                "weight": declining_weights + plateau_weights,
            }
        )

        status = compute_plateau_status(df)

        assert status["history_available"] is True
        assert status["warning"] == ""
        for zone in status["history"]:
            assert zone["start"] < zone["end"]
            assert zone["duration_days"] == (zone["end"] - zone["start"]).days
            assert zone["duration_days"] > 0
        if status["history"]:
            expected_avg = sum(z["duration_days"] for z in status["history"]) / len(
                status["history"]
            )
            assert status["avg_duration_days"] == expected_avg


# -----------------------------------------------------------------------
# Energy balance
# -----------------------------------------------------------------------


def _linear_daily_df(slope_per_day: float, days: int = 60, start: float = 100.0) -> pd.DataFrame:
    """Build a perfectly-linear daily DataFrame with a known slope (kg/day)."""
    dates = pd.date_range("2025-01-01", periods=days, freq="D")
    weights = [start + slope_per_day * i for i in range(days)]
    return pd.DataFrame({"date": dates, "weight": weights})


class TestEstimateEnergyBalance:
    """Tests for ``estimate_energy_balance()``."""

    def test_known_slope_gives_known_kcal(self) -> None:
        """A -0.1 kg/day trend yields exactly -770 kcal/day (deficit)."""
        df = _linear_daily_df(slope_per_day=-0.1)
        result = estimate_energy_balance(df)
        assert result["has_data"] is True
        # -0.1 kg/day * 7700 kcal/kg = -770 kcal/day.
        assert result["balance_kcal_day"] == pytest.approx(-770.0, abs=1e-6)
        assert result["trend_per_week"] == pytest.approx(-0.7, abs=1e-6)
        assert result["window_days"] == TrendConfig().window_days

    def test_ci_brackets_central_estimate(self) -> None:
        """The low/high bounds always bracket the central estimate."""
        df = _linear_daily_df(slope_per_day=-0.1)
        result = estimate_energy_balance(df)
        assert result["balance_low"] <= result["balance_kcal_day"] <= result["balance_high"]

    def test_noisy_data_has_uncertainty_width(self) -> None:
        """A noisy series produces a non-degenerate uncertainty range."""
        weights = [
            100.0, 99.2, 98.9, 98.0, 97.6, 96.7,
            96.5, 95.6, 95.1, 94.2, 93.9, 93.0,
        ]
        df = pd.DataFrame(
            {"date": pd.date_range("2025-06-01", periods=len(weights), freq="7D"), "weight": weights}
        )
        result = estimate_energy_balance(df)
        assert result["has_data"] is True
        assert result["balance_high"] - result["balance_low"] > 0.0

    def test_deficit_is_negative(self) -> None:
        """A downward trend is reported as a deficit (negative kcal)."""
        result = estimate_energy_balance(_linear_daily_df(slope_per_day=-0.05))
        assert result["balance_kcal_day"] < 0

    def test_surplus_is_positive(self) -> None:
        """An upward trend is reported as a surplus (positive kcal)."""
        result = estimate_energy_balance(_linear_daily_df(slope_per_day=0.05))
        assert result["balance_kcal_day"] > 0

    def test_empty_data_degrades(self) -> None:
        """No measurements yields has_data=False and a reason, never raises."""
        df = pd.DataFrame(columns=["date", "weight"])
        result = estimate_energy_balance(df)
        assert result["has_data"] is False
        assert result["balance_kcal_day"] is None
        assert result["reason"] != ""

    def test_insufficient_data_degrades(self) -> None:
        """Fewer than three points cannot fit a trend — degrades gracefully."""
        df = pd.DataFrame(
            {"date": pd.date_range("2025-06-01", periods=2, freq="7D"), "weight": [90.0, 89.0]}
        )
        result = estimate_energy_balance(df)
        assert result["has_data"] is False
        assert result["reason"] != ""


class TestEnergySeries:
    """Tests for ``energy_series()``."""

    def test_known_values(self) -> None:
        """A -0.1 kg/day trend yields ~-770 kcal/day at every interior point."""
        df = _linear_daily_df(slope_per_day=-0.1)
        points = energy_series(df)
        assert len(points) > 0
        # Skip the edges (partial rolling window) and check the interior.
        interior = [p["kcal"] for p in points[3:-3]]
        assert all(abs(kcal - (-770.0)) < 1e-6 for kcal in interior)

    def test_point_shape(self) -> None:
        """Every point exposes an ISO-able date and a finite kcal float."""
        points = energy_series(_linear_daily_df(slope_per_day=-0.1))
        for point in points:
            assert isinstance(point["date"], datetime.date)
            assert isinstance(point["kcal"], float)
            assert math.isfinite(point["kcal"])

    def test_empty_df(self) -> None:
        """An empty DataFrame yields no points."""
        df = pd.DataFrame(columns=["date", "weight"])
        assert energy_series(df) == []

    def test_single_row(self) -> None:
        """A single measurement has no defined rate, so no points."""
        df = pd.DataFrame({"date": [pd.Timestamp("2025-06-01")], "weight": [180.0]})
        assert energy_series(df) == []

    def test_density_constant(self) -> None:
        """The documented energy density constant is 7700 kcal/kg."""
        assert ENERGY_DENSITY_KCAL_PER_KG == 7700.0


# -----------------------------------------------------------------------
# Medication — compare_trend_around
# -----------------------------------------------------------------------


class TestCompareTrendAround:
    """Tests for ``compare_trend_around()``."""

    @staticmethod
    def _make_df(points: dict[str, float]) -> pd.DataFrame:
        """Build a weight DataFrame from an ISO-date → weight mapping."""
        return pd.DataFrame(
            {
                "date": pd.to_datetime(list(points.keys())),
                "weight": list(points.values()),
            }
        )

    def test_known_slopes_before_and_after(self) -> None:
        """Slopes match the constructed rates on each side of the event."""
        # -1 kg/week before, -2 kg/week after, sharing the pivot point.
        df = self._make_df(
            {
                "2025-06-24": 100.0,
                "2025-07-01": 99.0,
                "2025-07-08": 98.0,
                "2025-07-15": 97.0,  # pivot
                "2025-07-22": 95.0,
                "2025-07-29": 93.0,
                "2025-08-05": 91.0,
            }
        )
        result = compare_trend_around(df, datetime.date(2025, 7, 15), window_days=28)
        assert result.reason == ""
        assert result.n_before == 4
        assert result.n_after == 4
        assert result.slope_before_per_week is not None
        assert result.slope_after_per_week is not None
        assert result.slope_before_per_week == pytest.approx(-1.0, abs=1e-6)
        assert result.slope_after_per_week == pytest.approx(-2.0, abs=1e-6)
        assert result.delta_per_week == pytest.approx(-1.0, abs=1e-6)

    def test_not_enough_points_before(self) -> None:
        """Too few points before the event degrades gracefully."""
        df = self._make_df(
            {
                "2025-07-08": 98.0,  # only 1 pt in the before window besides pivot
                "2025-07-15": 97.0,  # pivot
                "2025-07-22": 95.0,
                "2025-07-29": 93.0,
                "2025-08-05": 91.0,
            }
        )
        result = compare_trend_around(df, datetime.date(2025, 7, 15), window_days=28)
        assert result.slope_before_per_week is None
        assert result.slope_after_per_week is not None
        assert result.delta_per_week is None
        assert result.n_before == 2
        assert "before" in result.reason

    def test_empty_dataframe(self) -> None:
        """An empty DataFrame yields null slopes and a reason."""
        df = pd.DataFrame(columns=["date", "weight"])
        result = compare_trend_around(df, datetime.date(2025, 7, 15))
        assert result.slope_before_per_week is None
        assert result.slope_after_per_week is None
        assert result.n_before == 0
        assert result.n_after == 0
        assert result.reason != ""


# -----------------------------------------------------------------------
# Medication — detect_dose_changes
# -----------------------------------------------------------------------


class TestDetectDoseChanges:
    """Tests for ``detect_dose_changes()``."""

    def test_first_dose_of_each_molecule_is_a_change(self) -> None:
        """The first dose of every molecule is flagged with is_first=True."""
        doses = [
            {"date": datetime.date(2025, 6, 1), "medication": "semaglutide", "dose_mg": 0.25},
            {"date": datetime.date(2025, 6, 2), "medication": "tirzepatide", "dose_mg": 2.5},
        ]
        changes = detect_dose_changes(doses)
        assert len(changes) == 2
        assert all(c.is_first for c in changes)
        assert all(c.previous_dose_mg is None for c in changes)

    def test_dose_increase_is_a_change(self) -> None:
        """A later dose with a different amount is flagged as a change."""
        doses = [
            {"date": datetime.date(2025, 6, 1), "medication": "semaglutide", "dose_mg": 0.25},
            {"date": datetime.date(2025, 7, 1), "medication": "semaglutide", "dose_mg": 0.5},
        ]
        changes = detect_dose_changes(doses)
        assert len(changes) == 2
        assert changes[1].is_first is False
        assert changes[1].previous_dose_mg == 0.25
        assert changes[1].dose_mg == 0.5

    def test_repeated_same_dose_is_not_a_change(self) -> None:
        """Repeating the same dose does not add a change event."""
        doses = [
            {"date": datetime.date(2025, 6, 1), "medication": "semaglutide", "dose_mg": 0.5},
            {"date": datetime.date(2025, 6, 8), "medication": "semaglutide", "dose_mg": 0.5},
            {"date": datetime.date(2025, 6, 15), "medication": "semaglutide", "dose_mg": 0.5},
        ]
        changes = detect_dose_changes(doses)
        assert len(changes) == 1
        assert changes[0].is_first is True

    def test_molecule_matching_is_case_insensitive(self) -> None:
        """Molecule names are grouped case-insensitively after trimming."""
        doses = [
            {"date": datetime.date(2025, 6, 1), "medication": "Semaglutide", "dose_mg": 0.25},
            {"date": datetime.date(2025, 6, 8), "medication": "semaglutide", "dose_mg": 0.25},
        ]
        changes = detect_dose_changes(doses)
        assert len(changes) == 1

    def test_empty_input(self) -> None:
        """No doses yields no change events."""
        assert detect_dose_changes([]) == []
