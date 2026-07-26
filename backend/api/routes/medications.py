"""CRUD and impact endpoints for medication doses."""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from analysis import compare_trend_around, detect_dose_changes
from api.deps import get_current_user, get_store
from api.schemas import DoseImpactOut, MedicationDoseIn, MedicationDoseOut
from db import NotFoundError, WeightDataStore

router = APIRouter(tags=["medications"])


@router.get("/medications", response_model=list[MedicationDoseOut])
def list_doses(
    start: datetime.date | None = Query(None, description="Start date (inclusive)"),
    end: datetime.date | None = Query(None, description="End date (inclusive)"),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> list[dict]:
    """Return the current user's medication doses, optionally filtered by date.

    Args:
        start: Earliest date (inclusive). Omit for no lower bound.
        end: Latest date (inclusive). Omit for no upper bound.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        List of doses sorted by date ascending.
    """
    return store.list_doses(keycloak_sub, start, end)


@router.post(
    "/medications",
    response_model=MedicationDoseOut,
    status_code=201,
    responses={
        400: {"description": "Future date"},
        422: {"description": "Validation error"},
    },
)
def add_dose(
    body: MedicationDoseIn,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Log a new medication dose for the current user.

    Args:
        body: Validated dose data (date, medication, optional dose/note).
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        The created dose.

    Raises:
        HTTPException: 400 if the date is in the future.
    """
    if body.date > datetime.date.today():
        raise HTTPException(status_code=400, detail="Future dates are not allowed")

    return store.add_dose(
        keycloak_sub,
        body.date,
        body.medication,
        body.dose_mg,
        body.note,
    )


@router.get("/medications/impact", response_model=list[DoseImpactOut])
def get_medication_impact(
    window_days: int = Query(
        28, ge=7, le=120, description="Half-window length in days on each side"
    ),
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> list[dict]:
    """Compare the weight trend before vs. after each dose change.

    A dose change is the first dose of a molecule or any later dose whose
    amount differs from the previous one for the same molecule. Each row
    degrades gracefully (``None`` slopes + ``reason``) when a window holds too
    few measurements.

    Args:
        window_days: Half-window length in days used on each side of a change.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        One impact row per dose change, ordered by date.
    """
    doses = store.list_doses(keycloak_sub)
    df = store.get_all(keycloak_sub)
    changes = detect_dose_changes(doses)

    rows: list[dict] = []
    for change in changes:
        comparison = compare_trend_around(df, change.date, window_days=window_days)
        rows.append(
            {
                "date": change.date,
                "medication": change.medication,
                "dose_mg": change.dose_mg,
                "previous_dose_mg": change.previous_dose_mg,
                "is_first": change.is_first,
                "slope_before_per_week": comparison.slope_before_per_week,
                "slope_after_per_week": comparison.slope_after_per_week,
                "n_before": comparison.n_before,
                "n_after": comparison.n_after,
                "delta_per_week": comparison.delta_per_week,
                "window_days": comparison.window_days,
                "reason": comparison.reason,
            }
        )
    return rows


@router.delete(
    "/medications",
    status_code=204,
    summary="Delete all medication doses for the current user",
)
def delete_all_doses(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> None:
    """Delete every medication dose belonging to the current user.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.
    """
    store.delete_all_doses(keycloak_sub)


@router.delete(
    "/medications/{dose_id}",
    status_code=204,
    responses={404: {"description": "Dose not found"}},
)
def delete_dose(
    dose_id: int,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> None:
    """Delete a medication dose owned by the current user.

    Args:
        dose_id: The primary key of the dose to remove.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Raises:
        HTTPException: 404 if no dose with this id exists for the user.
    """
    try:
        store.delete_dose(keycloak_sub, dose_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
