"""Shared test fixtures for the Weight Tracker test suite.

All fixtures use an **in-memory SQLite database** so that the real
``weight_tracker.db`` is never touched during testing.
"""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

import pandas as pd
import pytest
import sqlalchemy as sa

from db import WeightDataStore, measurements, metadata

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


@pytest.fixture
def engine() -> Engine:
    """In-memory SQLite engine with schema created.

    Returns:
        A ``sqlalchemy.engine.Engine`` backed by ``:memory:``.
    """
    eng = sa.create_engine("sqlite:///:memory:")

    # Enable CHECK constraints in SQLite.
    @sa.event.listens_for(eng, "connect")
    def _enable_checks(dbapi_conn: object, _rec: object) -> None:
        cursor = dbapi_conn.cursor()  # type: ignore[union-attr]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    metadata.create_all(eng)
    return eng


@pytest.fixture
def store(engine: Engine) -> WeightDataStore:
    """WeightDataStore bound to the in-memory engine, pre-seeded with sample data.

    The sample data mirrors a realistic weight-loss trajectory with 10
    points over ~3 months to ensure analysis functions have enough data
    to work with.

    Returns:
        A ``WeightDataStore`` instance.
    """
    ds = WeightDataStore(engine)
    sample_rows = [
        (datetime.date(2025, 6, 1), 183.5),
        (datetime.date(2025, 6, 15), 181.0),
        (datetime.date(2025, 7, 1), 179.0),
        (datetime.date(2025, 7, 15), 177.5),
        (datetime.date(2025, 8, 1), 175.0),
        (datetime.date(2025, 8, 15), 173.0),
        (datetime.date(2025, 9, 1), 171.5),
        (datetime.date(2025, 9, 15), 170.0),
        (datetime.date(2025, 10, 1), 168.5),
        (datetime.date(2025, 10, 15), 167.0),
    ]
    with engine.begin() as conn:
        for date, weight in sample_rows:
            conn.execute(
                measurements.insert().values(date=date, weight=weight)
            )
    return ds


@pytest.fixture
def sample_df() -> pd.DataFrame:
    """Small deterministic DataFrame for analysis tests (10 rows, known values).

    Returns:
        A ``pandas.DataFrame`` with ``date`` and ``weight`` columns
        representing a smooth downward trend.
    """
    dates = pd.date_range("2025-06-01", periods=10, freq="14D")
    weights = [183.5, 181.0, 179.0, 177.5, 175.0, 173.0, 171.5, 170.0, 168.5, 167.0]
    return pd.DataFrame({"date": dates, "weight": weights})
