"""Tests for the database layer (``db`` package).

All tests use an in-memory SQLite engine — the real database is never
touched.  All store operations are scoped to ``TEST_USER_SUB``.
"""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

import pandas as pd
import pytest
import sqlalchemy as sa

from conftest import TEST_USER_SUB

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
# get_engine
# -----------------------------------------------------------------------


class TestEngine:
    """Tests for ``get_engine()``."""

    def test_get_engine_creates_engine(self) -> None:
        """get_engine() raises RuntimeError when no DATABASE_URL is set."""
        import os

        from db import get_engine

        # Ensure DATABASE_URL is not set in this test scope.
        saved = os.environ.pop("DATABASE_URL", None)
        try:
            with pytest.raises(RuntimeError, match="DATABASE_URL"):
                get_engine()
        finally:
            if saved is not None:
                os.environ["DATABASE_URL"] = saved

    def test_get_engine_with_explicit_url(self) -> None:
        """get_engine() accepts an explicit SQLite URL for testing."""
        from db import get_engine
        from db import metadata as meta

        eng = get_engine("sqlite:///:memory:")
        meta.create_all(eng)
        with eng.connect() as conn:
            result = conn.execute(sa.text("SELECT 1"))
            assert result.scalar() == 1


# -----------------------------------------------------------------------
# get_all
# -----------------------------------------------------------------------


class TestGetAll:
    """Tests for ``WeightDataStore.get_all()``."""

    def test_returns_sorted_dataframe(self, store: WeightDataStore) -> None:
        """get_all() returns a DataFrame sorted ascending by date."""
        df = store.get_all(TEST_USER_SUB)
        assert not df.empty
        dates = pd.to_datetime(df["date"]).tolist()
        assert dates == sorted(dates)

    def test_returns_correct_columns(self, store: WeightDataStore) -> None:
        """get_all() returns date and weight columns."""
        df = store.get_all(TEST_USER_SUB)
        assert list(df.columns) == ["date", "weight"]

    def test_empty_store_returns_empty_df(self, engine: sa.engine.Engine) -> None:
        """get_all() returns empty DataFrame when no data exists for user."""
        empty_store = WeightDataStore(engine)
        df = empty_store.get_all("unknown-user-sub")
        assert df.empty
        assert list(df.columns) == ["date", "weight"]

    def test_data_isolation(self, engine: sa.engine.Engine) -> None:
        """Two different users see only their own measurements."""
        store = WeightDataStore(engine)
        sub_a = "user-a"
        sub_b = "user-b"

        store.add(sub_a, datetime.date(2025, 1, 1), 80.0)
        store.add(sub_b, datetime.date(2025, 1, 1), 90.0)

        df_a = store.get_all(sub_a)
        df_b = store.get_all(sub_b)

        assert len(df_a) == 1
        assert float(df_a["weight"].iloc[0]) == 80.0
        assert len(df_b) == 1
        assert float(df_b["weight"].iloc[0]) == 90.0


# -----------------------------------------------------------------------
# add
# -----------------------------------------------------------------------


class TestAdd:
    """Tests for ``WeightDataStore.add()``."""

    def test_insert_new_measurement(self, store: WeightDataStore) -> None:
        """add() inserts a new measurement correctly."""
        date = datetime.date(2025, 11, 1)
        store.add(TEST_USER_SUB, date, 165.0)
        df = store.get_all(TEST_USER_SUB)
        row = df[pd.to_datetime(df["date"]).dt.date == date]
        assert len(row) == 1
        assert float(row["weight"].iloc[0]) == 165.0

    def test_duplicate_date_raises(self, store: WeightDataStore) -> None:
        """add() raises DuplicateDateError on duplicate date for same user."""
        date = datetime.date(2025, 6, 1)  # Already in sample data.
        with pytest.raises(DuplicateDateError):
            store.add(TEST_USER_SUB, date, 180.0)

    def test_weight_below_range_rejected(self, engine: sa.engine.Engine) -> None:
        """Weight below 40 kg is rejected by the DB CHECK constraint."""
        s = WeightDataStore(engine)
        with pytest.raises((DuplicateDateError, sa.exc.IntegrityError)):
            s.add("check-user", datetime.date(2025, 12, 1), 5.0)

    def test_weight_above_range_rejected(self, engine: sa.engine.Engine) -> None:
        """Weight above 300 kg is rejected by the DB CHECK constraint."""
        s = WeightDataStore(engine)
        with pytest.raises((DuplicateDateError, sa.exc.IntegrityError)):
            s.add("check-user", datetime.date(2025, 12, 2), 400.0)

    def test_same_date_different_users_allowed(self, engine: sa.engine.Engine) -> None:
        """Two users can each have a measurement on the same date."""
        s = WeightDataStore(engine)
        date = datetime.date(2025, 3, 15)
        s.add("user-x", date, 70.0)
        s.add("user-y", date, 75.0)  # Must not raise.


# -----------------------------------------------------------------------
# remove
# -----------------------------------------------------------------------


class TestRemove:
    """Tests for ``WeightDataStore.remove()``."""

    def test_remove_existing(self, store: WeightDataStore) -> None:
        """remove() deletes an existing measurement."""
        date = datetime.date(2025, 6, 1)
        store.remove(TEST_USER_SUB, date)
        df = store.get_all(TEST_USER_SUB)
        dates = pd.to_datetime(df["date"]).dt.date.tolist()
        assert date not in dates

    def test_remove_missing_raises(self, store: WeightDataStore) -> None:
        """remove() raises NotFoundError for non-existent date."""
        with pytest.raises(NotFoundError):
            store.remove(TEST_USER_SUB, datetime.date(1999, 1, 1))


# -----------------------------------------------------------------------
# get_date_range
# -----------------------------------------------------------------------


class TestGetDateRange:
    """Tests for ``WeightDataStore.get_date_range()``."""

    def test_filters_inclusive(self, store: WeightDataStore) -> None:
        """get_date_range() returns rows within [start, end] inclusive."""
        start = datetime.date(2025, 7, 1)
        end = datetime.date(2025, 8, 15)
        df = store.get_date_range(TEST_USER_SUB, start, end)
        dates = pd.to_datetime(df["date"]).dt.date.tolist()
        for d in dates:
            assert start <= d <= end

    def test_returns_empty_for_no_match(self, store: WeightDataStore) -> None:
        """get_date_range() returns empty DataFrame when no rows match."""
        df = store.get_date_range(
            TEST_USER_SUB, datetime.date(2020, 1, 1), datetime.date(2020, 12, 31)
        )
        assert df.empty


# -----------------------------------------------------------------------
# User profile
# -----------------------------------------------------------------------


class TestUserProfile:
    """Tests for user profile and onboarding methods."""

    def test_get_or_create_user(self, engine: sa.engine.Engine) -> None:
        """get_or_create_user() returns the same ID on repeated calls."""
        s = WeightDataStore(engine)
        id1 = s.get_or_create_user("new-sub-abc")
        id2 = s.get_or_create_user("new-sub-abc")
        assert id1 == id2

    def test_onboarding_defaults_false(self, engine: sa.engine.Engine) -> None:
        """New users have onboarding_completed == False."""
        s = WeightDataStore(engine)
        profile = s.get_user_profile("brand-new-user")
        assert profile["onboarding_completed"] is False

    def test_complete_onboarding(self, engine: sa.engine.Engine) -> None:
        """complete_onboarding() sets the flag to True."""
        s = WeightDataStore(engine)
        s.complete_onboarding("onboard-test-user")
        profile = s.get_user_profile("onboard-test-user")
        assert profile["onboarding_completed"] is True


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
        csv.write_text("date,weight\n2025-06-01,180.0\n2025-06-02,179.0\n")
        summary = run_migration(
            csv_path=csv, engine=engine, keycloak_sub="migrate-user"
        )
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

        # Drop pre-existing rows for this user.
        with engine.begin() as conn:
            conn.execute(measurements.delete())

        summary = run_migration(
            csv_path=csv, engine=engine, keycloak_sub="aggregate-user"
        )
        assert summary["rows_inserted"] == 1  # Single aggregated row.

        s = WeightDataStore(engine)
        df = s.get_all("aggregate-user")
        assert len(df) == 1
        assert abs(float(df["weight"].iloc[0]) - 181.0) < 0.01

    def test_migration_idempotent(
        self, engine: sa.engine.Engine, tmp_path: Path
    ) -> None:
        """Running migration twice does not create duplicate rows."""
        csv = tmp_path / "test.csv"
        csv.write_text("date,weight\n2025-12-25,170.0\n")

        with engine.begin() as conn:
            conn.execute(measurements.delete())

        summary1 = run_migration(
            csv_path=csv, engine=engine, keycloak_sub="idem-user"
        )
        summary2 = run_migration(
            csv_path=csv, engine=engine, keycloak_sub="idem-user"
        )
        assert summary1["rows_inserted"] == 1
        assert summary2["rows_inserted"] == 0
        assert summary2["rows_skipped"] == 1
