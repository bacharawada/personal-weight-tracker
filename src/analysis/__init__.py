"""Analysis package — UI-agnostic data-science logic.

Re-exports all public symbols for convenient imports::

    from analysis import compute_rolling_mean, fit_exponential_decay
    from analysis import AnalysisConfig, FitResult, SummaryStats
"""

from __future__ import annotations

from analysis.curve_fit import (
    AnalysisConfig,
    FitResult,
    detect_deviations,
    exp_decay,
    extrapolate_fit,
    fit_exponential_decay,
)
from analysis.derivative import compute_derivative
from analysis.smoothing import compute_rolling_mean
from analysis.stats import SummaryStats, compute_summary_stats

__all__ = [
    "AnalysisConfig",
    "FitResult",
    "SummaryStats",
    "compute_derivative",
    "compute_rolling_mean",
    "compute_summary_stats",
    "detect_deviations",
    "exp_decay",
    "extrapolate_fit",
    "fit_exponential_decay",
]
