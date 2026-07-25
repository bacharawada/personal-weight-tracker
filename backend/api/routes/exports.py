"""Export endpoints — CSV download.

Both exports emit exactly the columns their matching importer expects, so a
downloaded file can be fed straight back into ``/api/imports/…/csv/preview``.

PNG export is performed client-side (the frontend serialises the rendered
SVG chart), so there is no server-side image-rendering endpoint here.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from api.deps import get_current_user, get_store

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(prefix="/exports", tags=["exports"])


def _csv_response(df: pd.DataFrame, filename: str) -> Response:
    """Render *df* as an attachment, or 204 when there is nothing to export.

    Args:
        df: The rows to serialise.
        filename: Name offered to the browser.

    Returns:
        A ``text/csv`` attachment response, or an empty 204 response.
    """
    if df.empty:
        return Response(status_code=204)

    return Response(
        content=df.to_csv(index=False),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv")
def export_csv(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> Response:
    """Export all measurements as a CSV file for the current user."""
    return _csv_response(store.get_all(keycloak_sub), "measurements.csv")


@router.get("/medications/csv")
def export_medications_csv(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> Response:
    """Export all medication doses as a CSV file for the current user.

    The internal row id is deliberately left out: it is meaningless outside
    this database and would be ignored on re-import.
    """
    doses = store.list_doses(keycloak_sub)
    df = pd.DataFrame(
        [
            {
                "date": dose["date"].isoformat(),
                "medication": dose["medication"],
                "dose_mg": dose["dose_mg"],
                "note": dose["note"],
            }
            for dose in doses
        ],
        columns=["date", "medication", "dose_mg", "note"],
    )
    return _csv_response(df, "medications.csv")
