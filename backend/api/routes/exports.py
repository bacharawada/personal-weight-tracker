"""Export endpoints — CSV download.

PNG export is performed client-side (the frontend serialises the rendered
SVG chart), so there is no server-side image-rendering endpoint here.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from api.deps import get_current_user, get_store

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(prefix="/exports", tags=["exports"])


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
