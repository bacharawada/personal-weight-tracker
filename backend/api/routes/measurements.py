"""CRUD endpoints for weight measurements."""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import get_current_user, get_store
from api.schemas import MeasurementIn, MeasurementOut, MeasurementUpdate, MtimeOut, PaletteOut
from db import DuplicateDateError, NotFoundError, WeightDataStore
from viz import PALETTES

router = APIRouter(tags=["measurements"])


@router.get("/measurements", response_model=list[MeasurementOut])
def list_measurements(
    start: datetime.date | None = Query(None, description="Start date (inclusive)"),
    end: datetime.date | None = Query(None, description="End date (inclusive)"),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> list[dict]:
    """Return all measurements for the current user, optionally filtered by date range.

    Args:
        start: Earliest date (inclusive). Omit for no lower bound.
        end: Latest date (inclusive). Omit for no upper bound.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        List of measurements sorted by date ascending.
    """
    if start is not None and end is not None:
        df = store.get_date_range(keycloak_sub, start, end)
    else:
        df = store.get_all(keycloak_sub)

    return [
        {
            "date": row["date"].date() if hasattr(row["date"], "date") else row["date"],
            "weight": row["weight"],
        }
        for _, row in df.iterrows()
    ]


@router.post(
    "/measurements",
    response_model=MeasurementOut,
    status_code=201,
    responses={409: {"description": "Duplicate date"}, 422: {"description": "Validation error"}},
)
def add_measurement(
    body: MeasurementIn,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Add a new weight measurement for the current user.

    Args:
        body: Validated measurement data (date + weight).
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        The created measurement.

    Raises:
        HTTPException: 400 if date is in the future, 409 if date already exists.
    """
    if body.date > datetime.date.today():
        raise HTTPException(status_code=400, detail="Future dates are not allowed")

    try:
        store.add(keycloak_sub, body.date, body.weight)
    except DuplicateDateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"date": body.date, "weight": body.weight}


@router.patch(
    "/measurements/{date}",
    response_model=MeasurementOut,
    responses={404: {"description": "Measurement not found"}, 422: {"description": "Validation error"}},
)
def update_measurement(
    date: datetime.date,
    body: MeasurementUpdate,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Update the weight for an existing measurement.

    Args:
        date: The date of the measurement to update.
        body: New weight value.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        The updated measurement.

    Raises:
        HTTPException: 404 if no measurement exists for this date.
    """
    try:
        store.update(keycloak_sub, date, body.weight)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {"date": date, "weight": body.weight}


@router.delete(
    "/measurements/{date}",
    status_code=204,
    responses={404: {"description": "Measurement not found"}},
)
def delete_measurement(
    date: datetime.date,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> None:
    """Delete the measurement for a given date.

    Args:
        date: The date of the measurement to remove.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Raises:
        HTTPException: 404 if no measurement exists for this date.
    """
    try:
        store.remove(keycloak_sub, date)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/palettes", response_model=PaletteOut)
def list_palettes() -> dict:
    """Return the list of available colour palette names."""
    return {"names": list(PALETTES.keys())}


@router.get("/db-mtime", response_model=MtimeOut)
def get_mtime(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the epoch timestamp of the most recent measurement write.

    The frontend polls this endpoint and only triggers a full data refresh
    when the value changes — i.e. when data has actually been written.
    Returns 0.0 when the user has no measurements yet.
    """
    return {"mtime": store.get_last_updated(keycloak_sub)}
