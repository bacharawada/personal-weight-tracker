"""Chart endpoints — return raw data series as JSON (frontend renders)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query

from analysis import MODEL_EXP, MODEL_LINEAR, AnalysisConfig, build_model_curve
from api.deps import get_current_user, get_store
from api.schemas import DerivativeChartData, ResidualsChartData, WeightChartData
from viz import (
    build_derivative_chart_data,
    build_residuals_chart_data,
    build_weight_chart_data,
)

if TYPE_CHECKING:
    import pandas as pd

    from analysis import ModelCurve
    from db import WeightDataStore

router = APIRouter(prefix="/charts", tags=["charts"])

_VALID_MODELS = (MODEL_EXP, MODEL_LINEAR)


def _parse_models(models: str) -> list[str]:
    """Parse the comma-separated ``models`` query value into a valid list.

    Unknown values are dropped and order/uniqueness follows the canonical
    ``(exp, linear)`` ordering so the legend reads consistently.

    Args:
        models: Raw query value, e.g. ``"exp,linear"`` or ``""``.

    Returns:
        A list of recognised model identifiers (possibly empty).
    """
    requested = {m.strip() for m in models.split(",") if m.strip()}
    return [m for m in _VALID_MODELS if m in requested]


def _parse_chart_params(
    smoothing: int = Query(5, ge=3, le=10, description="Rolling mean window"),
    horizon: int = Query(56, description="Extrapolation horizon in days"),
    models: str = Query("exp", description="Comma-separated prediction models"),
    band: bool = Query(True, description="Show model uncertainty bands"),
) -> dict:
    """Parse and validate common chart query parameters."""
    return {
        "smoothing": smoothing,
        "horizon": horizon,
        "models": _parse_models(models),
        "band": band,
    }


def _build_curves(df: pd.DataFrame, params: dict) -> list[ModelCurve]:
    """Build the selected model curves for a request.

    Args:
        df: The user's measurements.
        params: Parsed chart parameters (``models``, ``smoothing``,
            ``horizon``, ``band``).

    Returns:
        One ``ModelCurve`` per selected model (empty when none selected or no
        data).
    """
    if df.empty or not params["models"]:
        return []
    config = AnalysisConfig(smoothing_window=params["smoothing"])
    return [
        build_model_curve(
            df,
            kind,
            config=config,
            extrapolation_days=params["horizon"],
            with_band=params["band"],
        )
        for kind in params["models"]
    ]


@router.get("/weight", response_model=WeightChartData)
def get_weight_chart(
    params: dict = Depends(_parse_chart_params),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the main weight progression chart data series."""
    df = store.get_all(keycloak_sub)
    model_curves = _build_curves(df, params)
    goal_weight = store.get_user_profile(keycloak_sub)["goal_weight"]

    return build_weight_chart_data(
        df,
        model_curves=model_curves,
        smoothing_window=params["smoothing"],
        goal_weight=goal_weight,
        show_band=params["band"],
    )


@router.get("/derivative", response_model=DerivativeChartData)
def get_derivative_chart(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the derivative (rate of change) chart data series."""
    df = store.get_all(keycloak_sub)
    return build_derivative_chart_data(df)


@router.get("/residuals", response_model=ResidualsChartData)
def get_residuals_chart(
    params: dict = Depends(_parse_chart_params),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the residuals vs. model chart data series."""
    df = store.get_all(keycloak_sub)
    model_curves = _build_curves(df, params)
    return build_residuals_chart_data(df, model_curves=model_curves)
