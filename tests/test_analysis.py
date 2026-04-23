"""Tests for the analysis package (``analysis``).

All tests use deterministic sample data — no database interaction.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from analysis import (
    FitResult,
    compute_derivative,
    compute_rolling_mean,
    compute_summary_stats,
    detect_deviations,
    exp_decay,
    extrapolate_fit,
    fit_exponential_decay,
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
        """Days tracked equals number of unique dates."""
        stats = compute_summary_stats(sample_df)
        assert stats.days_tracked == 10

    def test_empty_dataframe(self) -> None:
        """Stats for empty DataFrame return zero values."""
        df = pd.DataFrame(columns=["date", "weight"])
        stats = compute_summary_stats(df)
        assert stats.total_loss_kg == 0.0
        assert stats.days_tracked == 0
