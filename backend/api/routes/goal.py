"""Goal projection endpoints (/api/goal)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from analysis import project_goal, project_milestones
from api.deps import get_current_user, get_store
from api.schemas import GoalProjectionOut, MilestonesProjectionOut

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(tags=["goal"])


@router.get("/goal", response_model=GoalProjectionOut)
def get_goal_projection(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Project when the current user will reach their goal weight.

    Projects from the user's current trajectory — a robust recency-weighted
    linear trend over their recent measurements. Returns a fully-populated
    projection even when no goal is set or there is too little data (see
    ``reason``).

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Goal projection dict.
    """
    profile = store.get_user_profile(keycloak_sub)
    df = store.get_all(keycloak_sub)

    projection = project_goal(
        df,
        goal_weight=profile["goal_weight"],
        target_date=profile["target_date"],
    )
    return {
        "has_goal": projection.has_goal,
        "reachable": projection.reachable,
        "predicted_date": projection.predicted_date,
        "predicted_date_optimistic": projection.predicted_date_optimistic,
        "predicted_date_pessimistic": projection.predicted_date_pessimistic,
        "days_remaining": projection.days_remaining,
        "already_reached": projection.already_reached,
        "on_track": projection.on_track,
        "days_ahead_behind": projection.days_ahead_behind,
        "trend_per_week": projection.trend_per_week,
        "reason": projection.reason,
    }


@router.get("/goal/milestones", response_model=MilestonesProjectionOut)
def get_goal_milestones(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Break the current user's goal into 10 equally-spaced milestones.

    The starting weight is the user's first recorded measurement. Returns
    a fully-populated projection even when no goal is set or there is no
    data yet (see ``reason``).

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Milestones projection dict.
    """
    profile = store.get_user_profile(keycloak_sub)
    df = store.get_all(keycloak_sub)

    return project_milestones(df, goal_weight=profile["goal_weight"])
