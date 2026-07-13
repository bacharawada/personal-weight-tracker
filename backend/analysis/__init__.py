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
    exp_decay_band,
    extrapolate_fit,
    fit_exponential_decay,
)
from analysis.derivative import compute_derivative
from analysis.energy import (
    ENERGY_DENSITY_KCAL_PER_KG,
    energy_series,
    estimate_energy_balance,
)
from analysis.goal import GoalProjection, project_goal
from analysis.models import (
    MODEL_EXP,
    MODEL_LINEAR,
    ModelCurve,
    ModelDiagnostics,
    build_model_curve,
)
from analysis.smoothing import compute_rolling_mean
from analysis.stats import SummaryStats, compute_summary_stats
from analysis.trend import TrendConfig, TrendFit, fit_recent_trend, trend_curve

__all__ = [
    "ENERGY_DENSITY_KCAL_PER_KG",
    "MODEL_EXP",
    "MODEL_LINEAR",
    "AnalysisConfig",
    "FitResult",
    "GoalProjection",
    "ModelCurve",
    "ModelDiagnostics",
    "SummaryStats",
    "TrendConfig",
    "TrendFit",
    "build_model_curve",
    "compute_derivative",
    "compute_rolling_mean",
    "compute_summary_stats",
    "detect_deviations",
    "energy_series",
    "estimate_energy_balance",
    "exp_decay",
    "exp_decay_band",
    "extrapolate_fit",
    "fit_exponential_decay",
    "fit_recent_trend",
    "project_goal",
    "trend_curve",
]
