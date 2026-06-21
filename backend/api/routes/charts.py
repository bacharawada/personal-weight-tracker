"""Chart endpoints — return Plotly figures as JSON."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from analysis import MODEL_EXP, MODEL_LINEAR, AnalysisConfig, build_model_curve
from api.deps import get_current_user, get_store
from viz import (
    PALETTES,
    build_derivative_figure,
    build_residuals_figure,
    build_weight_figure,
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
    palette: str = Query("Classic", description="Colour palette name"),
    dark: bool = Query(False, description="Dark mode"),
    models: str = Query("exp", description="Comma-separated prediction models"),
    band: bool = Query(True, description="Show model uncertainty bands"),
) -> dict:
    """Parse and validate common chart query parameters."""
    return {
        "smoothing": smoothing,
        "horizon": horizon,
        "palette": palette,
        "dark": dark,
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


@router.get("/weight")
def get_weight_chart(
    params: dict = Depends(_parse_chart_params),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the main weight progression chart as Plotly JSON."""
    df = store.get_all(keycloak_sub)
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    model_curves = _build_curves(df, params)
    goal_weight = store.get_user_profile(keycloak_sub)["goal_weight"]

    fig = build_weight_figure(
        df,
        model_curves=model_curves,
        palette=palette_obj,
        dark=params["dark"],
        smoothing_window=params["smoothing"],
        goal_weight=goal_weight,
        show_band=params["band"],
    )
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/derivative")
def get_derivative_chart(
    params: dict = Depends(_parse_chart_params),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the derivative (rate of change) chart as Plotly JSON."""
    df = store.get_all(keycloak_sub)
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    fig = build_derivative_figure(df, palette=palette_obj, dark=params["dark"])
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/residuals")
def get_residuals_chart(
    params: dict = Depends(_parse_chart_params),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the residuals vs. model chart as Plotly JSON."""
    df = store.get_all(keycloak_sub)
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    model_curves = _build_curves(df, params)

    fig = build_residuals_figure(
        df, model_curves=model_curves, palette=palette_obj, dark=params["dark"]
    )
    return JSONResponse(content=json.loads(fig.to_json()))
