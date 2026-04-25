"""User profile endpoints (/api/me)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from api.deps import get_current_user, get_store
from api.schemas import UserProfileOut

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserProfileOut)
def get_profile(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the current user's profile and onboarding status.

    Auto-creates the user record on first call (registration via Keycloak
    means we only need to track the sub + onboarding state here).

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        User profile dict.
    """
    return store.get_user_profile(keycloak_sub)


@router.post("/me/complete-onboarding", response_model=UserProfileOut)
def complete_onboarding(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Mark the current user's onboarding as completed.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Updated user profile dict.
    """
    store.complete_onboarding(keycloak_sub)
    return store.get_user_profile(keycloak_sub)
