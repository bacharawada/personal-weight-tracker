"""Public, unauthenticated share endpoints (/api/public/{token}).

These routes back the read-only shared dashboard. They resolve an opaque
share token to an internal user id and return the **exact same** payload
structures as the corresponding private endpoints, minus any identity
information (no Keycloak sub, email, or user id ever appears in a response).

Security notes:
    * These routes deliberately do **not** depend on ``get_current_user`` —
      they are reachable without a bearer token.
    * A token that is unknown *or* revoked yields a 404 with an identical
      message, so callers cannot probe which tokens ever existed.
    * The raw token is never logged.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException

from analysis import compute_summary_stats
from api.deps import get_store
from api.routes.charts import _build_curves, _parse_chart_params
from api.schemas import StatsOut, WeightChartData
from viz import build_weight_chart_data

if TYPE_CHECKING:
    from db import WeightDataStore

router = APIRouter(prefix="/public", tags=["public"])


def _resolve_or_404(token: str, store: WeightDataStore) -> int:
    """Resolve a share *token* to a user id or raise 404.

    Args:
        token: The opaque share token from the URL path.
        store: Injected data store.

    Returns:
        The owning internal ``users.id``.

    Raises:
        HTTPException 404: If the token is unknown or revoked (no distinction).
    """
    user_id = store.resolve_share_token(token)
    if user_id is None:
        raise HTTPException(status_code=404, detail="Share link not found")
    return user_id


@router.get("/{token}/charts/weight", response_model=WeightChartData)
def public_weight_chart(
    token: str,
    params: dict = Depends(_parse_chart_params),
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the shared user's weight chart data (same shape as the private one).

    Args:
        token: The opaque share token from the URL path.
        params: Parsed chart query parameters (shared with the private route).
        store: Injected data store.

    Returns:
        The weight chart data series. No identity fields are included.
    """
    user_id = _resolve_or_404(token, store)
    df = store.get_all_by_user_id(user_id)
    model_curves = _build_curves(df, params)
    goal_weight = store.get_goal_weight_by_user_id(user_id)

    return build_weight_chart_data(
        df,
        model_curves=model_curves,
        smoothing_window=params["smoothing"],
        goal_weight=goal_weight,
        show_band=params["band"],
    )


@router.get("/{token}/stats", response_model=StatsOut)
def public_stats(
    token: str,
    store: WeightDataStore = Depends(get_store),
) -> dict:
    """Return the shared user's summary KPIs (same shape as the private one).

    Args:
        token: The opaque share token from the URL path.
        store: Injected data store.

    Returns:
        The four summary KPIs. No identity fields are included.
    """
    user_id = _resolve_or_404(token, store)
    df = store.get_all_by_user_id(user_id)
    stats = compute_summary_stats(df)
    return {
        "total_loss_kg": stats.total_loss_kg,
        "avg_loss_per_week": stats.avg_loss_per_week,
        "current_trend": stats.current_trend,
        "days_tracked": stats.days_tracked,
        "measurement_count": len(df),
        "latest_weight": stats.latest_weight,
    }
