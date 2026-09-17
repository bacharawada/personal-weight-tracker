"""Summary statistics endpoint."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from analysis import (
    compute_plateau_status,
    compute_summary_stats,
    estimate_energy_balance,
    estimate_metabolism,
)
from api.deps import get_current_user, get_store
from api.schemas import EnergyBalanceOut, MetabolismOut, PlateauStatusOut, StatsOut

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsOut)
def get_stats(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the four summary KPIs for the current user.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Dict with total_loss_kg, avg_loss_per_week, current_trend,
        days_tracked, measurement_count.
    """
    df = store.get_all(keycloak_sub)
    stats = compute_summary_stats(df)
    return {
        "total_loss_kg": stats.total_loss_kg,
        "avg_loss_per_week": stats.avg_loss_per_week,
        "current_trend": stats.current_trend,
        "days_tracked": stats.days_tracked,
        "measurement_count": len(df),
        "latest_weight": stats.latest_weight,
    }


@router.get("/stats/plateau", response_model=PlateauStatusOut)
def get_plateau_status(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the current plateau/losing/gaining status and past plateau history.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Dict matching the ``PlateauStatusOut`` schema.
    """
    df = store.get_all(keycloak_sub)
    return compute_plateau_status(df)


@router.get("/stats/energy", response_model=EnergyBalanceOut)
def get_energy_balance(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the estimated daily energy balance for the current user.

    Derives an average daily energy balance (kcal) from the recent weight
    trend. Returns a fully-populated estimate even when there is too little
    data (see ``has_data`` / ``reason``).

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Energy-balance estimate dict.
    """
    df = store.get_all(keycloak_sub)
    return estimate_energy_balance(df)


@router.get("/stats/metabolism", response_model=MetabolismOut)
def get_metabolism(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the BMR / TDEE estimate for the current user.

    Combines the profile inputs (height, sex, birth date, activity level)
    with the latest weight and the trend-derived energy balance. Always
    returns a fully-populated payload; ``missing`` lists absent inputs.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Metabolism estimate dict.
    """
    profile = store.get_user_profile(keycloak_sub)
    df = store.get_all(keycloak_sub)
    latest_weight = float(df["weight"].iloc[-1]) if not df.empty else None
    return estimate_metabolism(
        weight_kg=latest_weight,
        height_cm=profile["height_cm"],
        sex=profile["sex"],
        birth_date=profile["birth_date"],
        activity_level=profile["activity_level"],
        energy_balance=estimate_energy_balance(df),
    )
