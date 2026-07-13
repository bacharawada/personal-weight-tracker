"""User profile endpoints (/api/me)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from api.deps import get_current_user, get_store
from api.schemas import ShareStatusOut, UserProfileOut, UserProfileUpdate

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


@router.patch("/me", response_model=UserProfileOut)
def update_profile(
    payload: UserProfileUpdate,
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Partially update the current user's profile.

    Only the fields present in the request body are modified; an explicit
    ``null`` clears that field.

    Args:
        payload: Partial profile fields to update.
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        The updated user profile dict.
    """
    store.update_profile(keycloak_sub, payload.model_dump(exclude_unset=True))
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


# ---------------------------------------------------------------------------
# Dashboard sharing (/api/me/share)
# ---------------------------------------------------------------------------


@router.get("/me/share", response_model=ShareStatusOut)
def get_share_status(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the current user's dashboard-sharing status.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Dict with ``enabled`` and the active ``token`` (``None`` when off).
    """
    user_id = store.get_or_create_user(keycloak_sub)
    token = store.get_share_token(user_id)
    return {"enabled": token is not None, "token": token}


@router.post("/me/share", response_model=ShareStatusOut, status_code=201)
def create_share_link(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Enable sharing (or regenerate the link) for the current user.

    Regenerating revokes any previous token so old links stop working.

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.

    Returns:
        Dict with ``enabled`` (always ``True``) and the new ``token``.
    """
    user_id = store.get_or_create_user(keycloak_sub)
    token = store.create_share_token(user_id)
    return {"enabled": True, "token": token}


@router.delete("/me/share", status_code=204)
def revoke_share_link(
    keycloak_sub: str = Depends(get_current_user),
    store: WeightDataStore = Depends(get_store),
) -> None:
    """Disable sharing for the current user (idempotent).

    Args:
        keycloak_sub: Injected from the auth dependency.
        store: Injected data store.
    """
    user_id = store.get_or_create_user(keycloak_sub)
    store.revoke_share_token(user_id)
