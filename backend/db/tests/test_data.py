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
        """get_all() returns date, weight and note columns."""
        df = store.get_all(TEST_USER_SUB)
        assert list(df.columns) == ["date", "weight", "note"]

    def test_empty_store_returns_empty_df(self, engine: sa.engine.Engine) -> None:
        """get_all() returns empty DataFrame when no data exists for user."""
        empty_store = WeightDataStore(engine)
        df = empty_store.get_all("unknown-user-sub")
        assert df.empty
        assert list(df.columns) == ["date", "weight", "note"]

    def test_note_defaults_to_none(self, store: WeightDataStore) -> None:
        """Seeded measurements (added without a note) expose note == None."""
        df = store.get_all(TEST_USER_SUB)
        assert df["note"].isna().all()

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

    def test_insert_with_note(self, store: WeightDataStore) -> None:
        """add() persists an optional note alongside the weight."""
        date = datetime.date(2025, 11, 2)
        store.add(TEST_USER_SUB, date, 164.0, note="Post-vacation weigh-in")
        row = store.get_one(TEST_USER_SUB, date)
        assert row is not None
        assert row["note"] == "Post-vacation weigh-in"

    def test_insert_without_note_defaults_to_none(self, store: WeightDataStore) -> None:
        """add() without a note leaves the column NULL."""
        date = datetime.date(2025, 11, 3)
        store.add(TEST_USER_SUB, date, 163.5)
        row = store.get_one(TEST_USER_SUB, date)
        assert row is not None
        assert row["note"] is None


# -----------------------------------------------------------------------
# update
# -----------------------------------------------------------------------


class TestUpdate:
    """Tests for ``WeightDataStore.update()``."""

    def test_update_weight_only(self, store: WeightDataStore) -> None:
        """Updating weight alone leaves an existing note untouched."""
        date = datetime.date(2025, 6, 1)
        store.update(TEST_USER_SUB, date, note="Before", note_provided=True)
        store.update(TEST_USER_SUB, date, weight=182.0)
        row = store.get_one(TEST_USER_SUB, date)
        assert row is not None
        assert row["weight"] == 182.0
        assert row["note"] == "Before"

    def test_update_note_only_leaves_weight_untouched(
        self, store: WeightDataStore
    ) -> None:
        """Updating note alone (note-only PATCH) leaves the weight untouched."""
        date = datetime.date(2025, 6, 1)
        original = store.get_one(TEST_USER_SUB, date)
        assert original is not None
        store.update(TEST_USER_SUB, date, note="Sick this week", note_provided=True)
        row = store.get_one(TEST_USER_SUB, date)
        assert row is not None
        assert row["weight"] == original["weight"]
        assert row["note"] == "Sick this week"

    def test_update_note_to_none_clears_it(self, store: WeightDataStore) -> None:
        """Passing note=None with note_provided=True clears an existing note."""
        date = datetime.date(2025, 6, 1)
        store.update(TEST_USER_SUB, date, note="Temporary", note_provided=True)
        store.update(TEST_USER_SUB, date, note=None, note_provided=True)
        row = store.get_one(TEST_USER_SUB, date)
        assert row is not None
        assert row["note"] is None

    def test_update_missing_date_raises(self, store: WeightDataStore) -> None:
        """update() raises NotFoundError for a date with no measurement."""
        with pytest.raises(NotFoundError):
            store.update(TEST_USER_SUB, datetime.date(1999, 1, 1), weight=100.0)


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

    def test_profile_defaults(self, engine: sa.engine.Engine) -> None:
        """New users have null profile fields and a 'kg' unit preference."""
        s = WeightDataStore(engine)
        profile = s.get_user_profile("profile-defaults-user")
        assert profile["height_cm"] is None
        assert profile["goal_weight"] is None
        assert profile["target_date"] is None
        assert profile["unit_preference"] == "kg"
        assert profile["date_order"] == "dmy"
        assert profile["date_separator"] == "/"
        assert profile["theme"] == "light"
        assert profile["palette"] == "Classic"
        assert profile["language"] is None

    def test_update_profile(self, engine: sa.engine.Engine) -> None:
        """update_profile() persists supplied fields."""
        import datetime

        s = WeightDataStore(engine)
        s.update_profile(
            "profile-update-user",
            {
                "height_cm": 175.0,
                "goal_weight": 70.0,
                "target_date": datetime.date(2026, 12, 31),
                "unit_preference": "lb",
            },
        )
        profile = s.get_user_profile("profile-update-user")
        assert profile["height_cm"] == 175.0
        assert profile["goal_weight"] == 70.0
        assert profile["target_date"] == datetime.date(2026, 12, 31)
        assert profile["unit_preference"] == "lb"

    def test_update_profile_partial(self, engine: sa.engine.Engine) -> None:
        """update_profile() leaves unspecified fields untouched."""
        s = WeightDataStore(engine)
        s.update_profile("partial-user", {"goal_weight": 80.0})
        s.update_profile("partial-user", {"unit_preference": "lb"})
        profile = s.get_user_profile("partial-user")
        assert profile["goal_weight"] == 80.0
        assert profile["unit_preference"] == "lb"

    def test_update_profile_ignores_unknown_keys(
        self, engine: sa.engine.Engine
    ) -> None:
        """update_profile() silently drops keys outside the allowed set."""
        s = WeightDataStore(engine)
        s.update_profile("safe-user", {"id": 999, "goal_weight": 65.0})
        profile = s.get_user_profile("safe-user")
        assert profile["goal_weight"] == 65.0
        assert profile["id"] != 999

    def test_update_profile_date_format(self, engine: sa.engine.Engine) -> None:
        """update_profile() persists the date order and separator."""
        s = WeightDataStore(engine)
        s.update_profile("date-fmt-user", {"date_order": "ymd", "date_separator": "-"})
        profile = s.get_user_profile("date-fmt-user")
        assert profile["date_order"] == "ymd"
        assert profile["date_separator"] == "-"

    def test_update_profile_keeps_not_null_preferences(
        self, engine: sa.engine.Engine
    ) -> None:
        """A None value never clears a NOT NULL display preference."""
        s = WeightDataStore(engine)
        s.update_profile("not-null-user", {"unit_preference": "lb"})
        s.update_profile(
            "not-null-user",
            {"unit_preference": None, "date_order": None, "date_separator": None},
        )
        profile = s.get_user_profile("not-null-user")
        assert profile["unit_preference"] == "lb"
        assert profile["date_order"] == "dmy"
        assert profile["date_separator"] == "/"

    def test_update_profile_appearance(self, engine: sa.engine.Engine) -> None:
        """update_profile() persists theme, palette and language."""
        s = WeightDataStore(engine)
        s.update_profile(
            "appearance-user",
            {"theme": "dark", "palette": "Teal", "language": "fr"},
        )
        profile = s.get_user_profile("appearance-user")
        assert profile["theme"] == "dark"
        assert profile["palette"] == "Teal"
        assert profile["language"] == "fr"

    def test_update_profile_clears_language(self, engine: sa.engine.Engine) -> None:
        """A None language is cleared (back to browser detection), not kept."""
        s = WeightDataStore(engine)
        s.update_profile("lang-clear-user", {"language": "fr", "theme": "dark"})
        s.update_profile("lang-clear-user", {"language": None, "theme": None})
        profile = s.get_user_profile("lang-clear-user")
        assert profile["language"] is None
        # theme is NOT NULL, so its None was ignored rather than applied.
        assert profile["theme"] == "dark"

    def test_display_preferences_by_user_id(self, engine: sa.engine.Engine) -> None:
        """get_display_preferences_by_user_id() returns no identity fields."""
        s = WeightDataStore(engine)
        user_id = s.get_or_create_user("prefs-by-id-user")
        s.update_profile(
            "prefs-by-id-user",
            {"unit_preference": "lb", "date_order": "mdy", "date_separator": "-"},
        )
        prefs = s.get_display_preferences_by_user_id(user_id)
        assert prefs == {
            "unit_preference": "lb",
            "date_order": "mdy",
            "date_separator": "-",
        }

    def test_display_preferences_unknown_user(self, engine: sa.engine.Engine) -> None:
        """get_display_preferences_by_user_id() raises for a missing user."""
        s = WeightDataStore(engine)
        with pytest.raises(NotFoundError):
            s.get_display_preferences_by_user_id(999_999)


# -----------------------------------------------------------------------
# Medication doses
# -----------------------------------------------------------------------


class TestMedicationDoses:
    """Tests for the ``WeightDataStore`` medication-dose methods."""

    def test_add_and_list(self, engine: sa.engine.Engine) -> None:
        """add_dose() persists a dose that list_doses() returns."""
        s = WeightDataStore(engine)
        created = s.add_dose(
            "dose-user",
            datetime.date(2025, 6, 1),
            "semaglutide",
            dose_mg=0.25,
            note="first",
        )
        assert isinstance(created["id"], int)
        doses = s.list_doses("dose-user")
        assert len(doses) == 1
        assert doses[0]["medication"] == "semaglutide"
        assert doses[0]["dose_mg"] == 0.25
        assert doses[0]["note"] == "first"

    def test_dose_mg_is_float_not_decimal(self, engine: sa.engine.Engine) -> None:
        """dose_mg is normalised to a plain float (never Decimal)."""
        s = WeightDataStore(engine)
        s.add_dose("dose-user", datetime.date(2025, 6, 1), "tirzepatide", dose_mg=2.5)
        dose = s.list_doses("dose-user")[0]
        assert isinstance(dose["dose_mg"], float)

    def test_add_dose_without_optional_fields(
        self, engine: sa.engine.Engine
    ) -> None:
        """add_dose() allows a null dose_mg and note."""
        s = WeightDataStore(engine)
        s.add_dose("dose-user", datetime.date(2025, 6, 1), "liraglutide")
        dose = s.list_doses("dose-user")[0]
        assert dose["dose_mg"] is None
        assert dose["note"] is None

    def test_list_sorted_by_date(self, engine: sa.engine.Engine) -> None:
        """list_doses() returns doses sorted ascending by date."""
        s = WeightDataStore(engine)
        s.add_dose("dose-user", datetime.date(2025, 7, 1), "semaglutide")
        s.add_dose("dose-user", datetime.date(2025, 6, 1), "semaglutide")
        dates = [d["date"] for d in s.list_doses("dose-user")]
        assert dates == sorted(dates)

    def test_list_date_range(self, engine: sa.engine.Engine) -> None:
        """list_doses() honours the inclusive start/end filter."""
        s = WeightDataStore(engine)
        s.add_dose("dose-user", datetime.date(2025, 6, 1), "semaglutide")
        s.add_dose("dose-user", datetime.date(2025, 7, 1), "semaglutide")
        s.add_dose("dose-user", datetime.date(2025, 8, 1), "semaglutide")
        doses = s.list_doses(
            "dose-user",
            start=datetime.date(2025, 6, 15),
            end=datetime.date(2025, 7, 15),
        )
        assert [d["date"] for d in doses] == [datetime.date(2025, 7, 1)]

    def test_delete_dose(self, engine: sa.engine.Engine) -> None:
        """delete_dose() removes an owned dose."""
        s = WeightDataStore(engine)
        created = s.add_dose("dose-user", datetime.date(2025, 6, 1), "semaglutide")
        s.delete_dose("dose-user", created["id"])
        assert s.list_doses("dose-user") == []

    def test_delete_missing_raises(self, engine: sa.engine.Engine) -> None:
        """delete_dose() raises NotFoundError for an unknown id."""
        s = WeightDataStore(engine)
        with pytest.raises(NotFoundError):
            s.delete_dose("dose-user", 999999)

    def test_delete_other_users_dose_raises(
        self, engine: sa.engine.Engine
    ) -> None:
        """A user cannot delete another user's dose (NotFoundError)."""
        s = WeightDataStore(engine)
        created = s.add_dose("owner-user", datetime.date(2025, 6, 1), "semaglutide")
        with pytest.raises(NotFoundError):
            s.delete_dose("intruder-user", created["id"])
        # The dose still belongs to the owner.
        assert len(s.list_doses("owner-user")) == 1

    def test_delete_all_doses(self, engine: sa.engine.Engine) -> None:
        """delete_all_doses() clears the user's journal and reports the count."""
        s = WeightDataStore(engine)
        s.add_dose("dose-user", datetime.date(2025, 6, 1), "semaglutide")
        s.add_dose("dose-user", datetime.date(2025, 6, 8), "semaglutide")
        assert s.delete_all_doses("dose-user") == 2
        assert s.list_doses("dose-user") == []

    def test_delete_all_doses_on_empty_journal(
        self, engine: sa.engine.Engine
    ) -> None:
        """delete_all_doses() reports zero rather than raising when empty."""
        s = WeightDataStore(engine)
        assert s.delete_all_doses("dose-user") == 0

    def test_delete_all_doses_spares_other_users(
        self, engine: sa.engine.Engine
    ) -> None:
        """delete_all_doses() only touches the calling user's rows."""
        s = WeightDataStore(engine)
        s.add_dose("user-a", datetime.date(2025, 6, 1), "semaglutide")
        s.add_dose("user-b", datetime.date(2025, 6, 1), "tirzepatide")
        assert s.delete_all_doses("user-a") == 1
        assert s.list_doses("user-a") == []
        assert len(s.list_doses("user-b")) == 1

    def test_dose_isolation_between_users(
        self, engine: sa.engine.Engine
    ) -> None:
        """Two users only see their own doses."""
        s = WeightDataStore(engine)
        s.add_dose("user-a", datetime.date(2025, 6, 1), "semaglutide")
        s.add_dose("user-b", datetime.date(2025, 6, 1), "tirzepatide")
        assert len(s.list_doses("user-a")) == 1
        assert s.list_doses("user-a")[0]["medication"] == "semaglutide"
        assert len(s.list_doses("user-b")) == 1
        assert s.list_doses("user-b")[0]["medication"] == "tirzepatide"

    def test_update_dose(self, engine: sa.engine.Engine) -> None:
        """update_dose() persists a partial update and returns the row."""
        s = WeightDataStore(engine)
        created = s.add_dose(
            "dose-user", datetime.date(2025, 6, 1), "semaglutide", dose_mg=0.25
        )
        updated = s.update_dose("dose-user", created["id"], {"dose_mg": 0.5})
        assert updated["dose_mg"] == 0.5
        assert updated["medication"] == "semaglutide"

    def test_update_missing_raises(self, engine: sa.engine.Engine) -> None:
        """update_dose() raises NotFoundError for an unknown id."""
        s = WeightDataStore(engine)
        with pytest.raises(NotFoundError):
            s.update_dose("dose-user", 999999, {"dose_mg": 0.5})


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


# -----------------------------------------------------------------------
# Share tokens
# -----------------------------------------------------------------------


class TestShareTokens:
    """Tests for the share-token store methods."""

    def test_no_token_by_default(self, store: WeightDataStore) -> None:
        """A user with no share token returns None."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        assert store.get_share_token(user_id) is None

    def test_create_and_get(self, store: WeightDataStore) -> None:
        """Creating a token makes it retrievable and resolvable."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        token = store.create_share_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0
        assert store.get_share_token(user_id) == token
        assert store.resolve_share_token(token) == user_id

    def test_regenerate_revokes_previous(self, store: WeightDataStore) -> None:
        """Re-creating a token revokes the old one (single active token)."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        first = store.create_share_token(user_id)
        second = store.create_share_token(user_id)
        assert first != second
        assert store.get_share_token(user_id) == second
        # Old token no longer resolves.
        assert store.resolve_share_token(first) is None
        assert store.resolve_share_token(second) == user_id

    def test_revoke(self, store: WeightDataStore) -> None:
        """Revoking clears the active token and stops resolution."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        token = store.create_share_token(user_id)
        store.revoke_share_token(user_id)
        assert store.get_share_token(user_id) is None
        assert store.resolve_share_token(token) is None

    def test_revoke_is_idempotent(self, store: WeightDataStore) -> None:
        """Revoking when nothing is active does not raise."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        store.revoke_share_token(user_id)
        store.revoke_share_token(user_id)
        assert store.get_share_token(user_id) is None

    def test_resolve_unknown_token(self, store: WeightDataStore) -> None:
        """An unknown token resolves to None."""
        assert store.resolve_share_token("does-not-exist") is None

    def test_get_goal_weight_by_user_id(self, store: WeightDataStore) -> None:
        """Goal weight is readable by internal user id."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        assert store.get_goal_weight_by_user_id(user_id) is None
        store.update_profile(TEST_USER_SUB, {"goal_weight": 150.0})
        assert store.get_goal_weight_by_user_id(user_id) == 150.0

    def test_get_all_by_user_id(self, store: WeightDataStore) -> None:
        """Measurements are readable by internal user id."""
        user_id = store.get_or_create_user(TEST_USER_SUB)
        df = store.get_all_by_user_id(user_id)
        assert len(df) == 10
