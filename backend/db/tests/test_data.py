"""Tests for the database layer (``db`` package).

All tests use an in-memory SQLite engine — the real database is never
touched.
"""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

import pandas as pd
import pytest
import sqlalchemy as sa

if TYPE_CHECKING:
    from pathlib import Path

from db import (
    DuplicateDateError,
    NotFoundError,
    WeightDataStore,
    measurements,
)
from db.migrate import run_migration

# -----------------------------------------------------------------------
# get_engine and get_db_mtime
# -----------------------------------------------------------------------


class TestEngineAndMtime:
    """Tests for ``get_engine()`` and ``get_db_mtime()``."""

    def test_get_engine_creates_engine(self, tmp_path: Path) -> None:
        """get_engine() returns a working Engine for a temp path."""
        from db import get_engine
        from db import metadata as meta

        db_path = tmp_path / "subdir" / "test.db"
        eng = get_engine(db_path)
        meta.create_all(eng)
        # Verify the engine can execute a simple query.
        with eng.connect() as conn:
            result = conn.execute(sa.text("SELECT 1"))
            assert result.scalar() == 1

    def test_get_db_mtime_existing_file(self, tmp_path: Path) -> None:
        """get_db_mtime() returns a positive float for an existing file."""
        from db import get_db_mtime

        db_file = tmp_path / "test.db"
        db_file.write_text("dummy")
        mtime = get_db_mtime(db_file)
        assert mtime > 0

    def test_get_db_mtime_missing_file(self, tmp_path: Path) -> None:
        """get_db_mtime() returns 0.0 for a non-existent file."""
        from db import get_db_mtime

        mtime = get_db_mtime(tmp_path / "nonexistent.db")
        assert mtime == 0.0


# -----------------------------------------------------------------------
# get_all
# -----------------------------------------------------------------------


class TestGetAll:
    """Tests for ``WeightDataStore.get_all()``."""

    def test_returns_sorted_dataframe(self, store: WeightDataStore) -> None:
        """get_all() returns a DataFrame sorted ascending by date."""
        df = store.get_all()
        assert not df.empty
        dates = pd.to_datetime(df["date"]).tolist()
        assert dates == sorted(dates)

    def test_returns_correct_columns(self, store: WeightDataStore) -> None:
        """get_all() returns date and weight columns."""
        df = store.get_all()
        assert list(df.columns) == ["date", "weight"]

    def test_empty_store_returns_empty_df(self, engine: sa.engine.Engine) -> None:
        """get_all() returns empty DataFrame when no data exists."""
        empty_store = WeightDataStore(engine)
        df = empty_store.get_all()
        assert df.empty
        assert list(df.columns) == ["date", "weight"]


# -----------------------------------------------------------------------
# add
# -----------------------------------------------------------------------


class TestAdd:
    """Tests for ``WeightDataStore.add()``."""

    def test_insert_new_measurement(self, store: WeightDataStore) -> None:
        """add() inserts a new measurement correctly."""
        date = datetime.date(2025, 11, 1)
        store.add(date, 165.0)
        df = store.get_all()
        row = df[pd.to_datetime(df["date"]).dt.date == date]
        assert len(row) == 1
        assert float(row["weight"].iloc[0]) == 165.0

    def test_duplicate_date_raises(self, store: WeightDataStore) -> None:
        """add() raises DuplicateDateError on duplicate date."""
        date = datetime.date(2025, 6, 1)  # Already in sample data.
        with pytest.raises(DuplicateDateError):
            store.add(date, 180.0)

    def test_weight_below_range_rejected(self, engine: sa.engine.Engine) -> None:
        """Weight below 40 kg is rejected by the DB CHECK constraint."""
        s = WeightDataStore(engine)
        with pytest.raises((DuplicateDateError, sa.exc.IntegrityError)):
            s.add(datetime.date(2025, 12, 1), 5.0)

    def test_weight_above_range_rejected(self, engine: sa.engine.Engine) -> None:
        """Weight above 300 kg is rejected by the DB CHECK constraint."""
        s = WeightDataStore(engine)
        with pytest.raises((DuplicateDateError, sa.exc.IntegrityError)):
            s.add(datetime.date(2025, 12, 2), 400.0)


# -----------------------------------------------------------------------
# remove
# -----------------------------------------------------------------------


class TestRemove:
    """Tests for ``WeightDataStore.remove()``."""

    def test_remove_existing(self, store: WeightDataStore) -> None:
        """remove() deletes an existing measurement."""
        date = datetime.date(2025, 6, 1)
        store.remove(date)
        df = store.get_all()
        dates = pd.to_datetime(df["date"]).dt.date.tolist()
        assert date not in dates

    def test_remove_missing_raises(self, store: WeightDataStore) -> None:
        """remove() raises NotFoundError for non-existent date."""
        with pytest.raises(NotFoundError):
            store.remove(datetime.date(1999, 1, 1))


# -----------------------------------------------------------------------
# get_date_range
# -----------------------------------------------------------------------


class TestGetDateRange:
    """Tests for ``WeightDataStore.get_date_range()``."""

    def test_filters_inclusive(self, store: WeightDataStore) -> None:
        """get_date_range() returns rows within [start, end] inclusive."""
        start = datetime.date(2025, 7, 1)
        end = datetime.date(2025, 8, 15)
        df = store.get_date_range(start, end)
        dates = pd.to_datetime(df["date"]).dt.date.tolist()
        for d in dates:
            assert start <= d <= end

    def test_returns_empty_for_no_match(self, store: WeightDataStore) -> None:
        """get_date_range() returns empty DataFrame when no rows match."""
        df = store.get_date_range(
            datetime.date(2020, 1, 1), datetime.date(2020, 12, 31)
        )
        assert df.empty


# -----------------------------------------------------------------------
# Migration
# -----------------------------------------------------------------------


class TestMigration:
    """Tests for ``migrate.py`` logic."""

    def test_migration_seeds_data(
        self, engine: sa.engine.Engine, tmp_path: Path
    ) -> None:
        """Migration inserts rows from a CSV file."""
        csv = tmp_path / "test.csv"
        csv.write_text(
            "date,weight\n2025-06-01,180.0\n2025-06-02,179.0\n"
        )
        summary = run_migration(csv_path=csv, engine=engine)
        assert summary["rows_read"] == 2
        assert summary["rows_inserted"] == 2
        assert summary["rows_skipped"] == 0

    def test_migration_same_day_aggregation(
        self, engine: sa.engine.Engine, tmp_path: Path
    ) -> None:
        """Same-day duplicates are aggregated by mean before insertion."""
        csv = tmp_path / "test.csv"
        csv.write_text(
            "date,weight\n2025-06-01,180.0\n2025-06-01,182.0\n"
        )

        # Drop pre-existing rows from this date (conftest might seed them).
        with engine.begin() as conn:
            conn.execute(measurements.delete())

        summary = run_migration(csv_path=csv, engine=engine)
        assert summary["rows_inserted"] == 1  # Single aggregated row.

        # Verify the weight is the mean.
        s = WeightDataStore(engine)
        df = s.get_all()
        assert len(df) == 1
        assert abs(float(df["weight"].iloc[0]) - 181.0) < 0.01

    def test_migration_idempotent(
        self, engine: sa.engine.Engine, tmp_path: Path
    ) -> None:
        """Running migration twice does not create duplicate rows."""
        csv = tmp_path / "test.csv"
        csv.write_text("date,weight\n2025-12-25,170.0\n")

        # Drop all rows first.
        with engine.begin() as conn:
            conn.execute(measurements.delete())

        summary1 = run_migration(csv_path=csv, engine=engine)
        summary2 = run_migration(csv_path=csv, engine=engine)
        assert summary1["rows_inserted"] == 1
        assert summary2["rows_inserted"] == 0
        assert summary2["rows_skipped"] == 1
