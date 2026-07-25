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


class TestMedicationCsvPreview:
    """Tests for POST /api/imports/medications/csv/preview."""

    def test_full_columns(self) -> None:
        """Date, molecule, dose and note are all parsed."""
        client = _make_client()
        csv = (
            "date,medication,dose_mg,note\n"
            "2025-06-01,semaglutide,0.25,first shot\n"
            "2025-06-08,semaglutide,0.5,\n"
        )
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total_rows"] == 2
        assert data["rows"][0] == {
            "date": "2025-06-01",
            "medication": "semaglutide",
            "dose_mg": 0.25,
            "note": "first shot",
        }
        assert data["rows"][1]["dose_mg"] == 0.5
        assert data["rows"][1]["note"] is None

    def test_dose_and_note_optional(self) -> None:
        """A file with only date and medication is accepted."""
        client = _make_client()
        csv = "date,medication\n2025-06-01,tirzepatide\n"
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 200
        row = r.json()["rows"][0]
        assert row["dose_mg"] is None
        assert row["note"] is None

    def test_plain_dose_column_accepted(self) -> None:
        """A ``dose`` header works as well as the exported ``dose_mg``."""
        client = _make_client()
        csv = "date;medication;dose\n01/06/2025;semaglutide;0,25\n"
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 200
        data = r.json()
        assert data["detected_date_format"] == "%d/%m/%Y"
        assert data["rows"][0] == {
            "date": "2025-06-01",
            "medication": "semaglutide",
            "dose_mg": 0.25,
            "note": None,
        }

    def test_missing_medication_column_returns_400(self) -> None:
        """A file without a medication column is rejected."""
        client = _make_client()
        csv = "date,weight\n2025-06-01,83.5\n"
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 400
        assert "medication" in r.json()["detail"]

    def test_unparsable_dose_skips_row(self) -> None:
        """A present-but-invalid dose invalidates the row."""
        client = _make_client()
        csv = (
            "date,medication,dose_mg\n"
            "2025-06-01,semaglutide,0.25\n"
            "2025-06-08,semaglutide,oops\n"
            "2025-06-15,semaglutide,-3\n"
        )
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total_rows"] == 1
        assert data["skipped_rows"] == 2

    def test_blank_medication_skips_row(self) -> None:
        """Rows without a molecule name are skipped."""
        client = _make_client()
        csv = "date,medication\n2025-06-01,semaglutide\n2025-06-08,\n"
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 200
        assert r.json()["skipped_rows"] == 1

    def test_no_valid_rows_returns_400(self) -> None:
        """A file whose every row is invalid is rejected."""
        client = _make_client()
        csv = "date,medication\n2025-06-01,\n"
        r = client.post(
            "/api/imports/medications/csv/preview", files=[_csv_file(csv)]
        )
        assert r.status_code == 400


class TestMedicationCsvConfirm:
    """Tests for POST /api/imports/medications/csv/confirm."""

    @staticmethod
    def _body(rows: list[dict]) -> dict:
        return {"rows": rows, "date_format": "%Y-%m-%d"}

    def test_inserts_rows(self) -> None:
        """Valid rows are persisted."""
        client = _make_client()
        body = self._body(
            [
                {"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25},
                {"date": "2025-06-08", "medication": "semaglutide", "dose_mg": 0.5},
            ]
        )
        r = client.post("/api/imports/medications/csv/confirm", json=body)
        assert r.status_code == 200
        assert r.json() == {
            "inserted": 2,
            "skipped_duplicates": 0,
            "skipped_invalid": 0,
        }

    def test_reimport_is_idempotent(self) -> None:
        """Importing the same rows twice inserts nothing the second time."""
        client = _make_client()
        body = self._body(
            [{"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25}]
        )
        assert client.post(
            "/api/imports/medications/csv/confirm", json=body
        ).json()["inserted"] == 1

        second = client.post("/api/imports/medications/csv/confirm", json=body).json()
        assert second["inserted"] == 0
        assert second["skipped_duplicates"] == 1

    def test_duplicates_within_payload_collapsed(self) -> None:
        """The same row repeated inside one payload is inserted once."""
        client = _make_client()
        row = {"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25}
        r = client.post(
            "/api/imports/medications/csv/confirm", json=self._body([row, row])
        )
        assert r.json()["inserted"] == 1
        assert r.json()["skipped_duplicates"] == 1

    def test_same_day_different_molecule_inserted(self) -> None:
        """Two molecules on the same day are both kept."""
        client = _make_client()
        body = self._body(
            [
                {"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25},
                {"date": "2025-06-01", "medication": "metformin", "dose_mg": 500},
            ]
        )
        assert client.post(
            "/api/imports/medications/csv/confirm", json=body
        ).json()["inserted"] == 2

    def test_same_day_different_dose_inserted(self) -> None:
        """A dose change logged the same day is not treated as a duplicate."""
        client = _make_client()
        body = self._body(
            [
                {"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25},
                {"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.5},
            ]
        )
        assert client.post(
            "/api/imports/medications/csv/confirm", json=body
        ).json()["inserted"] == 2

    def test_duplicate_match_ignores_molecule_case(self) -> None:
        """Molecule matching is case-insensitive."""
        client = _make_client()
        client.post(
            "/api/imports/medications/csv/confirm",
            json=self._body(
                [{"date": "2025-06-01", "medication": "semaglutide", "dose_mg": 0.25}]
            ),
        )
        r = client.post(
            "/api/imports/medications/csv/confirm",
            json=self._body(
                [{"date": "2025-06-01", "medication": "Semaglutide", "dose_mg": 0.25}]
            ),
        )
        assert r.json()["skipped_duplicates"] == 1

    def test_blank_medication_counted_invalid(self) -> None:
        """A blank molecule name is rejected at confirm time too."""
        client = _make_client()
        r = client.post(
            "/api/imports/medications/csv/confirm",
            json=self._body([{"date": "2025-06-01", "medication": "   "}]),
        )
        assert r.json()["skipped_invalid"] == 1

    def test_out_of_range_dose_counted_invalid(self) -> None:
        """A dose beyond the column's precision is rejected."""
        client = _make_client()
        r = client.post(
            "/api/imports/medications/csv/confirm",
            json=self._body(
                [{"date": "2025-06-01", "medication": "metformin", "dose_mg": 50000}]
            ),
        )
        assert r.json()["skipped_invalid"] == 1

    def test_malformed_date_counted_invalid(self) -> None:
        """A row whose date is not ISO 8601 is rejected."""
        client = _make_client()
        r = client.post(
            "/api/imports/medications/csv/confirm",
            json=self._body([{"date": "01/06/2025", "medication": "semaglutide"}]),
        )
        assert r.json()["skipped_invalid"] == 1
