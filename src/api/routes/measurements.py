"""CRUD endpoints for weight measurements."""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import get_store
from api.schemas import MeasurementIn, MeasurementOut, MtimeOut, PaletteOut
from db import DuplicateDateError, NotFoundError, WeightDataStore, get_db_mtime
from viz import PALETTES

router = APIRouter(tags=["measurements"])


@router.get("/measurements", response_model=list[MeasurementOut])
def list_measurements(
    start: datetime.date | None = Query(None, description="Start date (inclusive)"),
    end: datetime.date | None = Query(None, description="End date (inclusive)"),
    store: WeightDataStore = Depends(get_store),
) -> list[dict]:
    """Return all measurements, optionally filtered by date range.

    Args:
        start: Earliest date (inclusive). Omit for no lower bound.
        end: Latest date (inclusive). Omit for no upper bound.
        store: Injected data store.

    Returns:
        List of measurements sorted by date ascending.
    """
    if start is not None and end is not None:
        df = store.get_date_range(start, end)
    else:
        df = store.get_all()

    return [
        {"date": row["date"].date() if hasattr(row["date"], "date") else row["date"], "weight": row["weight"]}
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
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Add a new weight measurement.

    Args:
        body: Validated measurement data (date + weight).
        store: Injected data store.

    Returns:
        The created measurement.

    Raises:
        HTTPException: 400 if date is in the future, 409 if date already exists.
    """
    if body.date > datetime.date.today():
        raise HTTPException(status_code=400, detail="Future dates are not allowed")

    try:
        store.add(body.date, body.weight)
    except DuplicateDateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"date": body.date, "weight": body.weight}


@router.delete(
    "/measurements/{date}",
    status_code=204,
    responses={404: {"description": "Measurement not found"}},
)
def delete_measurement(
    date: datetime.date,
    store: WeightDataStore = Depends(get_store),
) -> None:
    """Delete the measurement for a given date.

    Args:
        date: The date of the measurement to remove.
        store: Injected data store.

    Raises:
        HTTPException: 404 if no measurement exists for this date.
    """
    try:
        store.remove(date)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/palettes", response_model=PaletteOut)
def list_palettes() -> dict:
    """Return the list of available colour palette names.

    Returns:
        A dict with a ``names`` key containing palette name strings.
    """
    return {"names": list(PALETTES.keys())}


@router.get("/db-mtime", response_model=MtimeOut)
def get_mtime() -> dict:
    """Return the database file modification time for polling.

    Returns:
        A dict with an ``mtime`` float (0.0 if file does not exist).
    """
    return {"mtime": get_db_mtime()}
