"""Chart endpoints — return Plotly figures as JSON."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from analysis import AnalysisConfig, fit_exponential_decay
from api.deps import get_store
from viz import (
    PALETTES,
    build_derivative_figure,
    build_residuals_figure,
    build_weight_figure,
)

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(prefix="/charts", tags=["charts"])


def _parse_chart_params(
    smoothing: int = Query(5, ge=3, le=10, description="Rolling mean window"),
    horizon: int = Query(56, description="Extrapolation horizon in days"),
    palette: str = Query("Classic", description="Colour palette name"),
    dark: bool = Query(False, description="Dark mode"),
) -> dict:
    """Parse and validate common chart query parameters.

    Args:
        smoothing: Rolling mean window size (3-10).
        horizon: Extrapolation horizon in days.
        palette: Palette name (must exist in PALETTES).
        dark: Whether dark mode is active.

    Returns:
        Dict of validated parameters.
    """
    return {
        "smoothing": smoothing,
        "horizon": horizon,
        "palette": palette,
        "dark": dark,
    }


@router.get("/weight")
def get_weight_chart(
    params: dict = Depends(_parse_chart_params),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the main weight progression chart as Plotly JSON.

    Args:
        params: Chart configuration parameters.
        store: Injected data store.

    Returns:
        Plotly figure JSON with content-type ``application/json``.
    """
    df = store.get_all()
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    config = AnalysisConfig(smoothing_window=params["smoothing"])
    fit_result = fit_exponential_decay(df, config) if not df.empty else None

    fig = build_weight_figure(
        df,
        fit_result=fit_result,
        palette=palette_obj,
        dark=params["dark"],
        smoothing_window=params["smoothing"],
        extrapolation_days=params["horizon"],
    )
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/derivative")
def get_derivative_chart(
    params: dict = Depends(_parse_chart_params),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the derivative (rate of change) chart as Plotly JSON.

    Args:
        params: Chart configuration parameters.
        store: Injected data store.

    Returns:
        Plotly figure JSON.
    """
    df = store.get_all()
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    fig = build_derivative_figure(df, palette=palette_obj, dark=params["dark"])
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/residuals")
def get_residuals_chart(
    params: dict = Depends(_parse_chart_params),
    store: WeightDataStore = Depends(get_store),
) -> JSONResponse:
    """Return the residuals vs. model chart as Plotly JSON.

    Args:
        params: Chart configuration parameters.
        store: Injected data store.

    Returns:
        Plotly figure JSON.
    """
    df = store.get_all()
    palette_obj = PALETTES.get(params["palette"], PALETTES["Classic"])
    config = AnalysisConfig(smoothing_window=params["smoothing"])
    fit_result = fit_exponential_decay(df, config) if not df.empty else None

    fig = build_residuals_figure(
        df, fit_result=fit_result, palette=palette_obj, dark=params["dark"]
    )
    return JSONResponse(content=json.loads(fig.to_json()))
