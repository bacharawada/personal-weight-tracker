"""Summary statistics endpoint."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from analysis import compute_summary_stats
from api.deps import get_current_user, get_store
from api.schemas import StatsOut

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
    }
