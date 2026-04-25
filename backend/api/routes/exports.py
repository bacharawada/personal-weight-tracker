"""Export endpoints — PNG and CSV downloads."""

from __future__ import annotations

import io
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from analysis import AnalysisConfig, fit_exponential_decay
from api.deps import get_current_user, get_store
from viz import PALETTES, build_weight_figure

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/png")
def export_png(
    smoothing: int = Query(5, ge=3, le=10),
    horizon: int = Query(56),
    palette: str = Query("Classic"),
    dark: bool = Query(False),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> Response:
    """Export the main weight chart as a PNG image for the current user."""
    df = store.get_all(keycloak_sub)
    if df.empty:
        return Response(status_code=204)

    palette_obj = PALETTES.get(palette, PALETTES["Classic"])
    config = AnalysisConfig(smoothing_window=smoothing)
    fit_result = fit_exponential_decay(df, config)

    fig = build_weight_figure(
        df,
        fit_result=fit_result,
        palette=palette_obj,
        dark=dark,
        smoothing_window=smoothing,
        extrapolation_days=horizon,
    )

    buf = io.BytesIO()
    fig.write_image(buf, format="png", width=1200, height=700, scale=2)
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="weight_chart.png"'},
    )


@router.get("/csv")
def export_csv(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> Response:
    """Export all measurements as a CSV file for the current user."""
    df = store.get_all(keycloak_sub)
    if df.empty:
        return Response(status_code=204)

    csv_content = df.to_csv(index=False)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="measurements.csv"'},
    )
