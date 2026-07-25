"""Tests for dashboard sharing — private /api/me/share and public routes.

Uses an in-memory SQLite database shared across a single app instance so
both users' data lives in one store. The ``current`` dict lets a test
switch which Keycloak subject the auth dependency returns, simulating two
different authenticated users hitting the private endpoints.
"""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool

from api import deps as api_deps
from api.routes import charts, public, stats
from api.routes import users as user_routes
from db import WeightDataStore, measurements, metadata

if TYPE_CHECKING:
    from collections.abc import Iterable

# Two distinct users with clearly different data footprints.
USER_A = "share-user-a"
USER_B = "share-user-b"

_A_ROWS = [
    (datetime.date(2025, 6, 1), 183.5),
    (datetime.date(2025, 7, 1), 179.0),
    (datetime.date(2025, 8, 1), 175.0),
    (datetime.date(2025, 9, 1), 171.5),
    (datetime.date(2025, 10, 1), 168.5),
]
_B_ROWS = [
    (datetime.date(2025, 6, 1), 92.0),
    (datetime.date(2025, 7, 1), 90.5),
    (datetime.date(2025, 8, 1), 89.0),
]

# Response keys that would leak user identity — none may appear in a
# public response body at any nesting depth.
_FORBIDDEN_KEYS = {"sub", "keycloak_sub", "user_id", "email"}


def _seed(
    store: WeightDataStore,
    keycloak_sub: str,
    rows: Iterable[tuple[datetime.date, float]],
    engine: sa.engine.Engine,
) -> None:
    """Insert measurement rows for a user."""
    user_id = store.get_or_create_user(keycloak_sub)
    with engine.begin() as conn:
        for date, weight in rows:
            conn.execute(
                measurements.insert().values(
                    user_id=user_id, date=date, weight=weight
                )
            )


def _build() -> tuple[TestClient, dict[str, str]]:
    """Build a TestClient with two seeded users and a switchable auth subject.

    Returns:
        Tuple of (client, current) where ``current["sub"]`` selects the
        authenticated user for private-endpoint calls.
    """
    engine = sa.create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @sa.event.listens_for(engine, "connect")
    def _enable_checks(dbapi_conn: object, _rec: object) -> None:
        cursor = dbapi_conn.cursor()  # type: ignore[union-attr]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    metadata.create_all(engine)
    store = WeightDataStore(engine)
    _seed(store, USER_A, _A_ROWS, engine)
    _seed(store, USER_B, _B_ROWS, engine)

    current = {"sub": USER_A}

    app = FastAPI()
    app.include_router(user_routes.router, prefix="/api")
    app.include_router(charts.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(public.router, prefix="/api")
    app.dependency_overrides[api_deps.get_store] = lambda: store
    app.dependency_overrides[api_deps.get_current_user] = lambda: current["sub"]

    return TestClient(app), current


def _assert_no_identity(payload: object) -> None:
    """Recursively assert no identity-leaking keys appear in *payload*."""
    if isinstance(payload, dict):
        for key, value in payload.items():
            assert key not in _FORBIDDEN_KEYS, f"leaked identity key: {key}"
            _assert_no_identity(value)
    elif isinstance(payload, list):
        for item in payload:
            _assert_no_identity(item)


# -----------------------------------------------------------------------
# Private /api/me/share lifecycle
# -----------------------------------------------------------------------


class TestShareLifecycle:
    """Create / get / regenerate / revoke through the private endpoints."""

    def test_full_cycle(self) -> None:
        """The share link can be created, read, regenerated, and revoked."""
        client, _ = _build()

        # Off by default.
        r = client.get("/api/me/share")
        assert r.status_code == 200
        assert r.json() == {"enabled": False, "token": None}

        # Create.
        r = client.post("/api/me/share")
        assert r.status_code == 201
        first = r.json()
        assert first["enabled"] is True
        assert isinstance(first["token"], str) and first["token"]

        # Read reflects the active token.
        r = client.get("/api/me/share")
        assert r.json() == {"enabled": True, "token": first["token"]}

        # Regenerate returns a different token; the old one stops working.
        r = client.post("/api/me/share")
        second = r.json()
        assert second["token"] != first["token"]
        assert client.get(f"/api/public/{first['token']}/stats").status_code == 404
        assert client.get(f"/api/public/{second['token']}/stats").status_code == 200

        # Revoke disables sharing.
        r = client.delete("/api/me/share")
        assert r.status_code == 204
        assert client.get("/api/me/share").json() == {
            "enabled": False,
            "token": None,
        }
        assert client.get(f"/api/public/{second['token']}/stats").status_code == 404


# -----------------------------------------------------------------------
# Public access
# -----------------------------------------------------------------------


class TestPublicAccess:
    """Unauthenticated access via a share token."""

    def _make_token(self, client: TestClient) -> str:
        return client.post("/api/me/share").json()["token"]

    def test_public_weight_chart_ok(self) -> None:
        """A valid token returns the weight chart data structure."""
        client, _ = _build()
        token = self._make_token(client)
        r = client.get(f"/api/public/{token}/charts/weight")
        assert r.status_code == 200
        body = r.json()
        assert {"raw", "smoothed", "models", "zones", "goal_weight"} <= set(body)
        assert len(body["raw"]) == len(_A_ROWS)
        assert {"date", "value"} <= set(body["raw"][0])

    def test_public_stats_ok(self) -> None:
        """A valid token returns the stats structure."""
        client, _ = _build()
        token = self._make_token(client)
        r = client.get(f"/api/public/{token}/stats")
        assert r.status_code == 200
        body = r.json()
        assert {"total_loss_kg", "days_tracked", "measurement_count"} <= set(body)
        assert body["measurement_count"] == len(_A_ROWS)

    def test_public_preferences_returns_owner_choices(self) -> None:
        """The public preferences endpoint mirrors the owner's own settings."""
        client, _ = _build()
        client.patch(
            "/api/me",
            json={
                "unit_preference": "lb",
                "date_order": "mdy",
                "date_separator": "-",
            },
        )
        token = self._make_token(client)
        r = client.get(f"/api/public/{token}/preferences")
        assert r.status_code == 200
        body = r.json()
        assert body == {
            "unit_preference": "lb",
            "date_order": "mdy",
            "date_separator": "-",
        }
        _assert_no_identity(body)

    def test_public_preferences_defaults(self) -> None:
        """An owner who never changed anything yields the column defaults."""
        client, _ = _build()
        token = self._make_token(client)
        body = client.get(f"/api/public/{token}/preferences").json()
        assert body == {
            "unit_preference": "kg",
            "date_order": "dmy",
            "date_separator": "/",
        }

    def test_unknown_token_returns_404(self) -> None:
        """An unknown token yields 404 on every public endpoint."""
        client, _ = _build()
        assert client.get("/api/public/nope/stats").status_code == 404
        assert client.get("/api/public/nope/charts/weight").status_code == 404
        assert client.get("/api/public/nope/preferences").status_code == 404

    def test_revoked_token_returns_404(self) -> None:
        """A revoked token yields 404 (no distinction from unknown)."""
        client, _ = _build()
        token = self._make_token(client)
        client.delete("/api/me/share")
        assert client.get(f"/api/public/{token}/stats").status_code == 404
        assert (
            client.get(f"/api/public/{token}/charts/weight").status_code == 404
        )

    def test_public_response_has_no_identity(self) -> None:
        """Public payloads contain no sub / email / user_id fields."""
        client, _ = _build()
        token = self._make_token(client)
        stats_body = client.get(f"/api/public/{token}/stats").json()
        chart_body = client.get(
            f"/api/public/{token}/charts/weight?models=exp,linear"
        ).json()
        _assert_no_identity(stats_body)
        _assert_no_identity(chart_body)

    def test_public_charts_accept_shared_params(self) -> None:
        """The public chart endpoint accepts the same query params as private."""
        client, _ = _build()
        token = self._make_token(client)
        r = client.get(
            f"/api/public/{token}/charts/weight?smoothing=7&models=exp,linear&band=true"
        )
        assert r.status_code == 200
        assert {m["id"] for m in r.json()["models"]} == {"exp", "linear"}


# -----------------------------------------------------------------------
# Isolation between users
# -----------------------------------------------------------------------


class TestShareIsolation:
    """A token exposes only its owner's data."""

    def test_token_scoped_to_owner(self) -> None:
        """Two users' tokens each resolve to only their own measurements."""
        client, current = _build()

        current["sub"] = USER_A
        token_a = client.post("/api/me/share").json()["token"]

        current["sub"] = USER_B
        token_b = client.post("/api/me/share").json()["token"]

        stats_a = client.get(f"/api/public/{token_a}/stats").json()
        stats_b = client.get(f"/api/public/{token_b}/stats").json()

        assert stats_a["measurement_count"] == len(_A_ROWS)
        assert stats_b["measurement_count"] == len(_B_ROWS)

        # Latest weights come from the respective user's own data.
        assert abs(stats_a["latest_weight"] - _A_ROWS[-1][1]) < 0.01
        assert abs(stats_b["latest_weight"] - _B_ROWS[-1][1]) < 0.01

        # And the weight chart raw series lengths match each owner.
        chart_a = client.get(f"/api/public/{token_a}/charts/weight").json()
        chart_b = client.get(f"/api/public/{token_b}/charts/weight").json()
        assert len(chart_a["raw"]) == len(_A_ROWS)
        assert len(chart_b["raw"]) == len(_B_ROWS)
