"""Tests for the FastAPI REST API (``api`` package).

Uses FastAPI's ``TestClient`` with an in-memory SQLite database so the
real ``weight_tracker.db`` is never touched.

All tests run as a fixed test user (``TEST_USER_SUB``) injected via
``dependency_overrides[get_current_user]``.
"""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from fastapi.testclient import TestClient

from api import deps as api_deps
from db import WeightDataStore, measurements, metadata

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine

# Stable subject used for all test requests.
TEST_USER_SUB = "test-api-user"


def _make_engine_and_store(
    seed: bool = False,
) -> tuple[Engine, WeightDataStore]:
    """Create an in-memory engine + store, optionally seeded.

    Uses ``StaticPool`` to ensure all connections share the same
    in-memory database, which is required because FastAPI's worker
    threads open new connections.

    Args:
        seed: Whether to insert sample rows.

    Returns:
        Tuple of (engine, store).
    """
    from sqlalchemy.pool import StaticPool

    eng = sa.create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @sa.event.listens_for(eng, "connect")
    def _enable_checks(dbapi_conn: object, _rec: object) -> None:
        cursor = dbapi_conn.cursor()  # type: ignore[union-attr]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    metadata.create_all(eng)
    store = WeightDataStore(eng)

    if seed:
        # Ensure the test user exists before inserting measurements.
        user_id = store.get_or_create_user(TEST_USER_SUB)
        rows = [
            (datetime.date(2025, 6, 1), 183.5),
            (datetime.date(2025, 7, 1), 179.0),
            (datetime.date(2025, 8, 1), 175.0),
            (datetime.date(2025, 9, 1), 171.5),
            (datetime.date(2025, 10, 1), 168.5),
        ]
        with eng.begin() as conn:
            for date, weight in rows:
                conn.execute(
                    measurements.insert().values(
                        user_id=user_id, date=date, weight=weight
                    )
                )

    return eng, store


def _make_client(seed: bool = False) -> TestClient:
    """Create a TestClient wired to a fresh in-memory database.

    Builds a minimal FastAPI app (no lifespan) with the same routes,
    injecting the test store and a fixed auth user via
    ``dependency_overrides``.

    Args:
        seed: Whether to insert sample rows.

    Returns:
        A ``TestClient`` instance.
    """
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    from api.routes import charts, exports, stats
    from api.routes import measurements as meas_routes
    from api.routes import users as user_routes

    engine, store = _make_engine_and_store(seed=seed)

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(meas_routes.router, prefix="/api")
    app.include_router(charts.router, prefix="/api")
    app.include_router(exports.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(user_routes.router, prefix="/api")

    # Override both dependencies: store and current user.
    app.dependency_overrides[api_deps.get_store] = lambda: store
    app.dependency_overrides[api_deps.get_current_user] = lambda: TEST_USER_SUB

    return TestClient(app)


# -----------------------------------------------------------------------
# Measurements CRUD
# -----------------------------------------------------------------------


class TestMeasurementsEndpoints:
    """Tests for /api/measurements endpoints."""

    def test_list_all(self) -> None:
        """GET /api/measurements returns all seeded rows."""
        client = _make_client(seed=True)
        r = client.get("/api/measurements")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        assert data[0]["date"] == "2025-06-01"

    def test_list_empty(self) -> None:
        """GET /api/measurements returns empty list when DB is empty."""
        client = _make_client(seed=False)
        r = client.get("/api/measurements")
        assert r.status_code == 200
        assert r.json() == []

    def test_add_measurement(self) -> None:
        """POST /api/measurements creates a new measurement."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-01", "weight": 185.0},
        )
        assert r.status_code == 201
        assert r.json()["weight"] == 185.0

    def test_add_duplicate_returns_409(self) -> None:
        """POST /api/measurements with duplicate date returns 409."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-06-01", "weight": 180.0},
        )
        assert r.status_code == 409

    def test_add_future_date_returns_400(self) -> None:
        """POST /api/measurements with future date returns 400."""
        client = _make_client(seed=True)
        future = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        r = client.post(
            "/api/measurements",
            json={"date": future, "weight": 180.0},
        )
        assert r.status_code == 400

    def test_add_invalid_weight_returns_422(self) -> None:
        """POST /api/measurements with weight out of range returns 422."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-15", "weight": 5.0},
        )
        assert r.status_code == 422

    def test_delete_measurement(self) -> None:
        """DELETE /api/measurements/{date} removes a measurement."""
        client = _make_client(seed=True)
        r = client.delete("/api/measurements/2025-06-01")
        assert r.status_code == 204

        r = client.get("/api/measurements")
        dates = [m["date"] for m in r.json()]
        assert "2025-06-01" not in dates

    def test_delete_missing_returns_404(self) -> None:
        """DELETE /api/measurements/{date} for missing date returns 404."""
        client = _make_client(seed=True)
        r = client.delete("/api/measurements/1999-01-01")
        assert r.status_code == 404


# -----------------------------------------------------------------------
# Stats
# -----------------------------------------------------------------------


class TestStatsEndpoint:
    """Tests for /api/stats endpoint."""

    def test_stats_with_data(self) -> None:
        """GET /api/stats returns valid KPIs."""
        client = _make_client(seed=True)
        r = client.get("/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_loss_kg" in data
        assert "days_tracked" in data
        assert "measurement_count" in data
        assert data["days_tracked"] == 123  # elapsed days: 2025-06-01 to 2025-10-01 inclusive
        assert data["measurement_count"] == 5
        assert data["total_loss_kg"] > 0

    def test_stats_empty(self) -> None:
        """GET /api/stats returns zeroes when DB is empty."""
        client = _make_client(seed=False)
        r = client.get("/api/stats")
        assert r.status_code == 200
        assert r.json()["days_tracked"] == 0


# -----------------------------------------------------------------------
# Charts
# -----------------------------------------------------------------------


class TestChartEndpoints:
    """Tests for /api/charts/* endpoints."""

    def test_weight_chart(self) -> None:
        """GET /api/charts/weight returns Plotly JSON with data key."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_derivative_chart(self) -> None:
        """GET /api/charts/derivative returns Plotly JSON."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/derivative")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_residuals_chart(self) -> None:
        """GET /api/charts/residuals returns Plotly JSON."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/residuals")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_chart_with_params(self) -> None:
        """Chart endpoints accept smoothing, horizon, palette, dark params."""
        client = _make_client(seed=True)
        r = client.get(
            "/api/charts/weight?smoothing=7&horizon=90&palette=Teal&dark=true"
        )
        assert r.status_code == 200

    def test_chart_empty_db(self) -> None:
        """Chart endpoints handle empty database gracefully."""
        client = _make_client(seed=False)
        r = client.get("/api/charts/weight")
        assert r.status_code == 200


# -----------------------------------------------------------------------
# Exports
# -----------------------------------------------------------------------


class TestExportEndpoints:
    """Tests for /api/exports/* endpoints."""

    def test_csv_export(self) -> None:
        """GET /api/exports/csv returns CSV content."""
        client = _make_client(seed=True)
        r = client.get("/api/exports/csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]
        assert "date" in r.text

    def test_csv_empty(self) -> None:
        """GET /api/exports/csv returns 204 when DB is empty."""
        client = _make_client(seed=False)
        r = client.get("/api/exports/csv")
        assert r.status_code == 204


# -----------------------------------------------------------------------
# Palettes and DB mtime
# -----------------------------------------------------------------------


class TestMiscEndpoints:
    """Tests for /api/palettes and /api/db-mtime endpoints."""

    def test_palettes(self) -> None:
        """GET /api/palettes returns at least 5 palette names."""
        client = _make_client(seed=True)
        r = client.get("/api/palettes")
        assert r.status_code == 200
        assert len(r.json()["names"]) >= 5

    def test_db_mtime(self) -> None:
        """GET /api/db-mtime returns a float mtime."""
        client = _make_client(seed=True)
        r = client.get("/api/db-mtime")
        assert r.status_code == 200
        assert isinstance(r.json()["mtime"], float)


# -----------------------------------------------------------------------
# User profile
# -----------------------------------------------------------------------


class TestUserEndpoints:
    """Tests for /api/me endpoints."""

    def test_get_profile_creates_user(self) -> None:
        """GET /api/me auto-creates user on first call."""
        client = _make_client(seed=False)
        r = client.get("/api/me")
        assert r.status_code == 200
        data = r.json()
        assert data["keycloak_sub"] == TEST_USER_SUB
        assert data["onboarding_completed"] is False

    def test_complete_onboarding(self) -> None:
        """POST /api/me/complete-onboarding sets flag to true."""
        client = _make_client(seed=False)
        r = client.post("/api/me/complete-onboarding")
        assert r.status_code == 200
        assert r.json()["onboarding_completed"] is True
