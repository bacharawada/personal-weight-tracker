"""Tests for CSV import endpoints (/api/imports/csv/*)."""

from __future__ import annotations

import io

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from api import deps as api_deps
from api.routes import imports as import_routes
from db import WeightDataStore, metadata

TEST_USER_SUB = "import-test-user"


def _make_client() -> TestClient:
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

    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(import_routes.router, prefix="/api")

    app.dependency_overrides[api_deps.get_store] = lambda: store
    app.dependency_overrides[api_deps.get_current_user] = lambda: TEST_USER_SUB

    return TestClient(app)


def _csv_file(content: str, filename: str = "test.csv") -> tuple:
    return ("file", (filename, io.BytesIO(content.encode()), "text/csv"))


class TestCsvPreview:
    """Tests for POST /api/imports/csv/preview."""

    def test_basic_iso_dates(self) -> None:
        """ISO date format is detected and rows are returned."""
        client = _make_client()
        csv = "date,weight\n2025-06-01,83.5\n2025-06-15,82.0\n"
        r = client.post("/api/imports/csv/preview", files=[_csv_file(csv)])
        assert r.status_code == 200
        data = r.json()
        assert data["total_rows"] == 2
        assert data["detected_date_format"] == "%Y-%m-%d"
        assert len(data["rows"]) == 2
        assert data["rows"][0]["date"] == "2025-06-01"
        assert data["rows"][0]["weight"] == 83.5

    def test_european_comma_decimal(self) -> None:
        """European comma-decimal weights are parsed correctly."""
        client = _make_client()
        csv = "date;weight\n01/06/2025;83,5\n15/06/2025;82,0\n"
        r = client.post("/api/imports/csv/preview", files=[_csv_file(csv)])
        assert r.status_code == 200
        data = r.json()
        assert data["delimiter"] == ";"
        assert data["rows"][0]["weight"] == 83.5

    def test_european_date_format(self) -> None:
        """DD/MM/YYYY date format is detected."""
        client = _make_client()
        csv = "date,weight\n15/06/2025,83.5\n01/07/2025,82.0\n"
        r = client.post("/api/imports/csv/preview", files=[_csv_file(csv)])
        assert r.status_code == 200
        assert r.json()["detected_date_format"] == "%d/%m/%Y"

    def test_missing_columns_returns_400(self) -> None:
        """Missing required columns returns 400."""
        client = _make_client()
        csv = "day,kg\n2025-06-01,83.5\n"
        r = client.post("/api/imports/csv/preview", files=[_csv_file(csv)])
        assert r.status_code == 400

    def test_invalid_weight_rows_skipped(self) -> None:
        """Rows with out-of-range or unparseable weights are counted as skipped."""
        client = _make_client()
        csv = "date,weight\n2025-06-01,83.5\n2025-06-02,bad\n2025-06-03,5.0\n"
        r = client.post("/api/imports/csv/preview", files=[_csv_file(csv)])
        assert r.status_code == 200
        data = r.json()
        assert data["total_rows"] == 1
        assert data["skipped_rows"] == 2


class TestCsvConfirm:
    """Tests for POST /api/imports/csv/confirm."""

    def test_inserts_rows(self) -> None:
        """Valid rows are inserted into the database."""
        client = _make_client()
        body = {
            "rows": [
                {"date": "2025-06-01", "weight": 83.5},
                {"date": "2025-06-15", "weight": 82.0},
            ],
            "date_format": "%Y-%m-%d",
        }
        r = client.post("/api/imports/csv/confirm", json=body)
        assert r.status_code == 200
        data = r.json()
        assert data["inserted"] == 2
        assert data["skipped_duplicates"] == 0
        assert data["skipped_invalid"] == 0

    def test_duplicate_dates_skipped(self) -> None:
        """Rows with duplicate dates are counted but not inserted twice."""
        client = _make_client()
        body = {
            "rows": [{"date": "2025-06-01", "weight": 83.5}],
            "date_format": "%Y-%m-%d",
        }
        r1 = client.post("/api/imports/csv/confirm", json=body)
        assert r1.json()["inserted"] == 1

        r2 = client.post("/api/imports/csv/confirm", json=body)
        assert r2.json()["inserted"] == 0
        assert r2.json()["skipped_duplicates"] == 1

    def test_invalid_weight_skipped(self) -> None:
        """Rows with out-of-range weights are counted as skipped_invalid."""
        client = _make_client()
        body = {
            "rows": [{"date": "2025-06-01", "weight": 5.0}],
            "date_format": "%Y-%m-%d",
        }
        r = client.post("/api/imports/csv/confirm", json=body)
        assert r.status_code == 200
        assert r.json()["skipped_invalid"] == 1
