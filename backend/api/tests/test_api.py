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

    from api.routes import charts, exports, goal, stats
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
    app.include_router(goal.router, prefix="/api")
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

    def test_add_measurement_with_note(self) -> None:
        """POST /api/measurements persists an optional note."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-02", "weight": 180.0, "note": "Post-vacation"},
        )
        assert r.status_code == 201
        assert r.json()["note"] == "Post-vacation"

        r = client.get("/api/measurements")
        row = next(m for m in r.json() if m["date"] == "2025-05-02")
        assert row["note"] == "Post-vacation"

    def test_add_measurement_without_note_is_none(self) -> None:
        """POST /api/measurements omitting note returns note == None."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-03", "weight": 180.0},
        )
        assert r.status_code == 201
        assert r.json()["note"] is None

    def test_add_measurement_blank_note_becomes_none(self) -> None:
        """A whitespace-only note is normalized to None."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-04", "weight": 180.0, "note": "   "},
        )
        assert r.status_code == 201
        assert r.json()["note"] is None

    def test_add_measurement_note_is_trimmed(self) -> None:
        """Leading/trailing whitespace is stripped from the note."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-05", "weight": 180.0, "note": "  hello  "},
        )
        assert r.status_code == 201
        assert r.json()["note"] == "hello"

    def test_add_measurement_note_too_long_returns_422(self) -> None:
        """A note longer than 500 characters is rejected."""
        client = _make_client(seed=True)
        r = client.post(
            "/api/measurements",
            json={"date": "2025-05-06", "weight": 180.0, "note": "x" * 501},
        )
        assert r.status_code == 422

    def test_patch_measurement_weight_only(self) -> None:
        """PATCH /api/measurements/{date} with only weight updates the weight."""
        client = _make_client(seed=True)
        r = client.patch(
            "/api/measurements/2025-06-01",
            json={"weight": 182.0},
        )
        assert r.status_code == 200
        assert r.json()["weight"] == 182.0
        assert r.json()["note"] is None

    def test_patch_measurement_note_only(self) -> None:
        """PATCH /api/measurements/{date} with only note leaves weight untouched."""
        client = _make_client(seed=True)
        r = client.patch(
            "/api/measurements/2025-06-01",
            json={"note": "Felt bloated"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["note"] == "Felt bloated"
        assert body["weight"] == 183.5  # unchanged from seed data

    def test_patch_measurement_clears_note_with_empty_string(self) -> None:
        """PATCH with note='' clears an existing note."""
        client = _make_client(seed=True)
        client.patch("/api/measurements/2025-06-01", json={"note": "Temp note"})
        r = client.patch("/api/measurements/2025-06-01", json={"note": ""})
        assert r.status_code == 200
        assert r.json()["note"] is None

    def test_patch_measurement_empty_body_returns_422(self) -> None:
        """PATCH with no fields at all is rejected."""
        client = _make_client(seed=True)
        r = client.patch("/api/measurements/2025-06-01", json={})
        assert r.status_code == 422

    def test_patch_measurement_null_weight_returns_422(self) -> None:
        """PATCH cannot explicitly clear the weight (NOT NULL column)."""
        client = _make_client(seed=True)
        r = client.patch("/api/measurements/2025-06-01", json={"weight": None})
        assert r.status_code == 422

    def test_patch_measurement_missing_date_returns_404(self) -> None:
        """PATCH for a date with no measurement returns 404."""
        client = _make_client(seed=True)
        r = client.patch("/api/measurements/1999-01-01", json={"weight": 100.0})
        assert r.status_code == 404

    def test_patch_measurement_note_too_long_returns_422(self) -> None:
        """PATCH note longer than 500 characters is rejected."""
        client = _make_client(seed=True)
        r = client.patch(
            "/api/measurements/2025-06-01", json={"note": "x" * 501}
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

    def test_energy_balance_with_data(self) -> None:
        """GET /api/stats/energy returns a signed daily energy balance."""
        client = _make_client(seed=True)
        r = client.get("/api/stats/energy")
        assert r.status_code == 200
        data = r.json()
        assert data["has_data"] is True
        assert data["balance_kcal_day"] is not None
        assert data["balance_low"] <= data["balance_kcal_day"] <= data["balance_high"]
        assert data["balance_kcal_day"] < 0  # seed data trends down (deficit)

    def test_energy_balance_empty(self) -> None:
        """GET /api/stats/energy degrades gracefully on an empty database."""
        client = _make_client(seed=False)
        r = client.get("/api/stats/energy")
        assert r.status_code == 200
        data = r.json()
        assert data["has_data"] is False
        assert data["balance_kcal_day"] is None
        assert data["reason"] != ""


# -----------------------------------------------------------------------
# Plateau detection
# -----------------------------------------------------------------------


class TestPlateauEndpoint:
    """Tests for /api/stats/plateau endpoint."""

    def test_steady_loss_reports_losing(self) -> None:
        """The seeded monthly-loss data is reported as 'losing', not a plateau."""
        client = _make_client(seed=True)
        r = client.get("/api/stats/plateau")
        assert r.status_code == 200
        data = r.json()
        assert data["has_data"] is True
        assert data["state"] == "losing"
        assert data["in_plateau"] is False
        assert data["reason"] != ""

    def test_empty_db_degrades_gracefully(self) -> None:
        """With no measurements, the endpoint returns a populated reason, not an error."""
        client = _make_client(seed=False)
        r = client.get("/api/stats/plateau")
        assert r.status_code == 200
        data = r.json()
        assert data["has_data"] is False
        assert data["state"] is None
        assert data["history"] == []
        assert data["reason"] != ""

    def test_response_shape_matches_schema(self) -> None:
        """The response includes every field of PlateauStatusOut."""
        client = _make_client(seed=True)
        r = client.get("/api/stats/plateau")
        assert r.status_code == 200
        data = r.json()
        expected_keys = {
            "has_data",
            "state",
            "in_plateau",
            "trend_per_week",
            "since_date",
            "duration_days",
            "history",
            "avg_duration_days",
            "history_available",
            "reason",
            "warning",
        }
        assert expected_keys <= set(data)


# -----------------------------------------------------------------------
# Charts
# -----------------------------------------------------------------------


class TestChartEndpoints:
    """Tests for /api/charts/* endpoints."""

    def test_weight_chart(self) -> None:
        """GET /api/charts/weight returns the weight data series."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight")
        assert r.status_code == 200
        body = r.json()
        assert {"raw", "smoothed", "models", "zones", "goal_weight"} <= set(body)
        assert len(body["raw"]) > 0
        assert {"date", "value", "note"} <= set(body["raw"][0])

    def test_weight_chart_carries_note_on_raw_points(self) -> None:
        """A measurement's note is carried on its raw chart point."""
        client = _make_client(seed=True)
        client.patch("/api/measurements/2025-06-01", json={"note": "Chart note"})
        r = client.get("/api/charts/weight")
        assert r.status_code == 200
        raw = r.json()["raw"]
        point = next(p for p in raw if p["date"] == "2025-06-01")
        assert point["note"] == "Chart note"
        other = next(p for p in raw if p["date"] != "2025-06-01")
        assert other["note"] is None

    def test_derivative_chart(self) -> None:
        """GET /api/charts/derivative returns bars and a smoothed series."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/derivative")
        assert r.status_code == 200
        body = r.json()
        assert "bars" in body
        assert "smoothed" in body

    def test_residuals_chart(self) -> None:
        """GET /api/charts/residuals returns residual series."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/residuals")
        assert r.status_code == 200
        body = r.json()
        assert "series" in body
        assert "sigma" in body

    def test_chart_with_params(self) -> None:
        """Chart endpoints accept smoothing, horizon, models and band params."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight?smoothing=7&horizon=90&band=false")
        assert r.status_code == 200

    def test_chart_empty_db(self) -> None:
        """Chart endpoints handle empty database gracefully."""
        client = _make_client(seed=False)
        r = client.get("/api/charts/weight")
        assert r.status_code == 200
        assert r.json()["raw"] == []

    def test_chart_both_models_with_band(self) -> None:
        """Selecting both models with a band returns two model series + bands."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight?models=exp,linear&band=true")
        assert r.status_code == 200
        models = r.json()["models"]
        assert {m["id"] for m in models} == {"exp", "linear"}
        assert any(len(m["band"]) > 0 for m in models)

    def test_chart_model_diagnostics(self) -> None:
        """Each model series carries fitted-parameter diagnostics."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight?models=exp,linear")
        assert r.status_code == 200
        by_id = {m["id"]: m["diagnostics"] for m in r.json()["models"]}
        assert by_id["exp"] is not None
        assert by_id["exp"]["c"] is not None
        assert by_id["exp"]["half_life_days"] is not None
        assert by_id["linear"] is not None
        assert by_id["linear"]["slope_per_week"] is not None
        assert by_id["linear"]["window_days"] is not None

    def test_chart_no_models(self) -> None:
        """An empty models list draws raw + rolling only (no overlay)."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight?models=")
        assert r.status_code == 200
        body = r.json()
        assert len(body["raw"]) > 0
        assert body["models"] == []

    def test_chart_unknown_model_dropped(self) -> None:
        """Unknown model identifiers are ignored, not errors."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/weight?models=exp,bogus")
        assert r.status_code == 200
        assert {m["id"] for m in r.json()["models"]} == {"exp"}

    def test_residuals_two_models(self) -> None:
        """Residuals endpoint accepts multiple models."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/residuals?models=exp,linear")
        assert r.status_code == 200
        assert len(r.json()["series"]) == 2

    def test_energy_chart(self) -> None:
        """GET /api/charts/energy returns kcal/day bars."""
        client = _make_client(seed=True)
        r = client.get("/api/charts/energy")
        assert r.status_code == 200
        body = r.json()
        assert "bars" in body
        assert len(body["bars"]) > 0
        assert {"date", "kcal"} <= set(body["bars"][0])

    def test_energy_chart_empty_db(self) -> None:
        """Energy chart handles an empty database gracefully."""
        client = _make_client(seed=False)
        r = client.get("/api/charts/energy")
        assert r.status_code == 200
        assert r.json()["bars"] == []


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

    def test_csv_export_includes_note_column(self) -> None:
        """The exported CSV has a note column with the persisted note."""
        client = _make_client(seed=True)
        client.patch("/api/measurements/2025-06-01", json={"note": "CSV note"})
        r = client.get("/api/exports/csv")
        assert r.status_code == 200
        lines = r.text.splitlines()
        assert lines[0].split(",") == ["date", "weight", "note"]
        row = next(line for line in lines if line.startswith("2025-06-01"))
        assert "CSV note" in row

    def test_csv_empty(self) -> None:
        """GET /api/exports/csv returns 204 when DB is empty."""
        client = _make_client(seed=False)
        r = client.get("/api/exports/csv")
        assert r.status_code == 204


# -----------------------------------------------------------------------
# DB mtime
# -----------------------------------------------------------------------


class TestMiscEndpoints:
    """Tests for the /api/db-mtime endpoint."""

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

    def test_profile_defaults(self) -> None:
        """A fresh profile exposes the new fields with sensible defaults."""
        client = _make_client(seed=False)
        data = client.get("/api/me").json()
        assert data["height_cm"] is None
        assert data["goal_weight"] is None
        assert data["target_date"] is None
        assert data["unit_preference"] == "kg"

    def test_patch_profile_updates_fields(self) -> None:
        """PATCH /api/me persists profile fields."""
        client = _make_client(seed=False)
        r = client.patch(
            "/api/me",
            json={
                "height_cm": 180.0,
                "goal_weight": 75.0,
                "target_date": "2026-12-31",
                "unit_preference": "lb",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["height_cm"] == 180.0
        assert data["goal_weight"] == 75.0
        assert data["target_date"] == "2026-12-31"
        assert data["unit_preference"] == "lb"

    def test_patch_profile_partial(self) -> None:
        """PATCH /api/me only touches the fields supplied."""
        client = _make_client(seed=False)
        client.patch("/api/me", json={"goal_weight": 80.0})
        client.patch("/api/me", json={"unit_preference": "lb"})
        data = client.get("/api/me").json()
        assert data["goal_weight"] == 80.0  # preserved across the second patch
        assert data["unit_preference"] == "lb"

    def test_patch_profile_rejects_out_of_range(self) -> None:
        """PATCH /api/me validates the weight/height ranges."""
        client = _make_client(seed=False)
        r = client.patch("/api/me", json={"goal_weight": 10.0})
        assert r.status_code == 422

    def test_patch_profile_rejects_bad_unit(self) -> None:
        """PATCH /api/me rejects an unknown unit preference."""
        client = _make_client(seed=False)
        r = client.patch("/api/me", json={"unit_preference": "stone"})
        assert r.status_code == 422


# -----------------------------------------------------------------------
# Goal projection
# -----------------------------------------------------------------------


class TestGoalEndpoint:
    """Tests for /api/goal endpoint."""

    def test_no_goal_set(self) -> None:
        """Without a goal, the projection reports has_goal=False."""
        client = _make_client(seed=True)
        data = client.get("/api/goal").json()
        assert data["has_goal"] is False
        assert data["reachable"] is None

    def test_reachable_goal_returns_date(self) -> None:
        """A goal below the trend yields a predicted date."""
        client = _make_client(seed=True)
        client.patch("/api/me", json={"goal_weight": 160.0})
        data = client.get("/api/goal").json()
        assert data["has_goal"] is True
        assert data["reachable"] is True
        assert data["predicted_date"] is not None

    def test_already_reached(self) -> None:
        """A goal above the current weight is already reached."""
        client = _make_client(seed=True)
        client.patch("/api/me", json={"goal_weight": 200.0})
        data = client.get("/api/goal").json()
        assert data["already_reached"] is True
        assert data["days_remaining"] == 0

    def test_on_track_with_target_date(self) -> None:
        """A generous target date is reported as on track."""
        client = _make_client(seed=True)
        client.patch(
            "/api/me",
            json={"goal_weight": 160.0, "target_date": "2030-01-01"},
        )
        data = client.get("/api/goal").json()
        assert data["on_track"] is True
        assert data["days_ahead_behind"] <= 0


# -----------------------------------------------------------------------
# Goal milestones
# -----------------------------------------------------------------------


class TestGoalMilestonesEndpoint:
    """Tests for /api/goal/milestones endpoint."""

    def test_no_goal_set(self) -> None:
        """Without a goal, the projection reports has_goal=False."""
        client = _make_client(seed=True)
        data = client.get("/api/goal/milestones").json()
        assert data["has_goal"] is False
        assert data["milestones"] == []

    def test_partial_progress(self) -> None:
        """A goal partway reached returns 10 milestones, some achieved."""
        client = _make_client(seed=True)
        client.patch("/api/me", json={"goal_weight": 150.0})
        data = client.get("/api/goal/milestones").json()
        assert data["has_goal"] is True
        assert len(data["milestones"]) == 10
        assert data["current_milestone_index"] == 4
        assert data["remaining_milestones"] == 6
        assert data["next_milestone"] is not None
        assert data["next_milestone"]["index"] == 5

    def test_goal_already_reached(self) -> None:
        """A goal already reached by the latest weight marks all milestones done."""
        client = _make_client(seed=True)
        client.patch("/api/me", json={"goal_weight": 170.0})
        data = client.get("/api/goal/milestones").json()
        assert data["current_milestone_index"] == 10
        assert data["remaining_milestones"] == 0
        assert data["next_milestone"] is None
        assert data["percent_complete"] == 100.0

    def test_goal_above_start_weight(self) -> None:
        """A goal above the starting weight degrades gracefully."""
        client = _make_client(seed=True)
        client.patch("/api/me", json={"goal_weight": 200.0})
        data = client.get("/api/goal/milestones").json()
        assert data["has_goal"] is True
        assert data["milestones"] == []
        assert data["next_milestone"] is None
