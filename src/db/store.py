"""WeightDataStore — high-level CRUD interface for measurements.

All public methods translate database-level exceptions into
domain-specific ones so callers never handle raw SQLAlchemy errors.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

from db.engine import DuplicateDateError, NotFoundError, measurements

if TYPE_CHECKING:
    import datetime

    from sqlalchemy.engine import Engine


class WeightDataStore:
    """High-level interface for weight measurement persistence.

    Args:
        engine: A SQLAlchemy ``Engine`` bound to the target database.
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    # -- queries -----------------------------------------------------------

    def get_all(self) -> pd.DataFrame:
        """Return all measurements sorted ascending by date.

        Returns:
            A ``pandas.DataFrame`` with columns ``date`` (datetime.date)
            and ``weight`` (float). Empty DataFrame when no data exists.
        """
        stmt = sa.select(measurements.c.date, measurements.c.weight).order_by(
            measurements.c.date.asc()
        )
        with self._engine.connect() as conn:
            result = conn.execute(stmt)
            rows = result.fetchall()
        if not rows:
            return pd.DataFrame(columns=["date", "weight"])
        df = pd.DataFrame(rows, columns=["date", "weight"])
        df["date"] = pd.to_datetime(df["date"])
        return df

    def get_date_range(
        self, start: datetime.date, end: datetime.date
    ) -> pd.DataFrame:
        """Return measurements within *[start, end]* inclusive.

        Args:
            start: Earliest date (inclusive).
            end: Latest date (inclusive).

        Returns:
            A ``pandas.DataFrame`` sorted by date.
        """
        stmt = (
            sa.select(measurements.c.date, measurements.c.weight)
            .where(measurements.c.date >= start)
            .where(measurements.c.date <= end)
            .order_by(measurements.c.date.asc())
        )
        with self._engine.connect() as conn:
            result = conn.execute(stmt)
            rows = result.fetchall()
        if not rows:
            return pd.DataFrame(columns=["date", "weight"])
        df = pd.DataFrame(rows, columns=["date", "weight"])
        df["date"] = pd.to_datetime(df["date"])
        return df

    # -- mutations ---------------------------------------------------------

    def add(self, date: datetime.date, weight: float) -> None:
        """Insert a new measurement.

        Args:
            date: The measurement date.
            weight: Body weight in kilograms (must be 40--300).

        Raises:
            DuplicateDateError: If a measurement for *date* already exists.
        """
        stmt = measurements.insert().values(date=date, weight=weight)
        try:
            with self._engine.begin() as conn:
                conn.execute(stmt)
        except IntegrityError as exc:
            error_msg = str(exc).lower()
            if "unique" in error_msg:
                raise DuplicateDateError(
                    f"A measurement already exists for {date}"
                ) from exc
            # Re-raise CHECK constraint violations with a clear message.
            if "check" in error_msg or "constraint" in error_msg:
                raise DuplicateDateError(
                    f"Weight {weight} kg is outside the allowed range (40-300 kg)"
                ) from exc
            raise  # pragma: no cover

    def update(self, date: datetime.date, weight: float) -> None:
        """Update the weight for an existing measurement.

        Args:
            date: The date of the measurement to update.
            weight: New body weight in kilograms (must be 40--300).

        Raises:
            NotFoundError: If no measurement exists for *date*.
        """
        stmt = (
            measurements.update()
            .where(measurements.c.date == date)
            .values(weight=weight)
        )
        try:
            with self._engine.begin() as conn:
                result = conn.execute(stmt)
                if result.rowcount == 0:
                    raise NotFoundError(f"No measurement found for {date}")
        except IntegrityError as exc:
            raise DuplicateDateError(
                f"Weight {weight} kg is outside the allowed range (40-300 kg)"
            ) from exc

    def remove(self, date: datetime.date) -> None:
        """Delete the measurement for the given date.

        Args:
            date: The date of the measurement to remove.

        Raises:
            NotFoundError: If no measurement exists for *date*.
        """
        stmt = measurements.delete().where(measurements.c.date == date)
        with self._engine.begin() as conn:
            result = conn.execute(stmt)
            if result.rowcount == 0:
                raise NotFoundError(f"No measurement found for {date}")
