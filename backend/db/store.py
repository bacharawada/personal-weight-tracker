"""WeightDataStore — high-level CRUD interface for measurements.

All public methods are scoped to a specific user identified by their
Keycloak subject (``keycloak_sub``).  The store transparently resolves
the internal ``user_id`` integer PK from the ``users`` table so that
callers only ever deal with Keycloak sub strings.

All public methods translate database-level exceptions into
domain-specific ones so callers never handle raw SQLAlchemy errors.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

from db.engine import DuplicateDateError, NotFoundError, measurements, users

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

    # -- user management ---------------------------------------------------

    def get_or_create_user(self, keycloak_sub: str) -> int:
        """Return the internal user PK for *keycloak_sub*, creating the
        user row if it does not yet exist.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.

        Returns:
            The integer ``users.id`` primary key.
        """
        with self._engine.begin() as conn:
            row = conn.execute(
                sa.select(users.c.id).where(users.c.keycloak_sub == keycloak_sub)
            ).fetchone()
            if row is not None:
                return int(row[0])
            result = conn.execute(
                users.insert().values(keycloak_sub=keycloak_sub)
            )
            return int(result.inserted_primary_key[0])

    def get_user_profile(self, keycloak_sub: str) -> dict:
        """Return the user profile dict for *keycloak_sub*.

        Creates the user row on first call (auto-registration pattern).

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.

        Returns:
            Dict with keys ``id``, ``keycloak_sub``, ``onboarding_completed``.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        with self._engine.connect() as conn:
            row = conn.execute(
                sa.select(
                    users.c.id,
                    users.c.keycloak_sub,
                    users.c.onboarding_completed,
                ).where(users.c.id == user_id)
            ).fetchone()
        if row is None:
            raise NotFoundError(f"User not found: {keycloak_sub}")  # pragma: no cover
        return {
            "id": row[0],
            "keycloak_sub": row[1],
            "onboarding_completed": row[2],
        }

    def complete_onboarding(self, keycloak_sub: str) -> None:
        """Mark onboarding as completed for *keycloak_sub*.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        with self._engine.begin() as conn:
            conn.execute(
                users.update()
                .where(users.c.id == user_id)
                .values(onboarding_completed=True)
            )

    # -- queries -----------------------------------------------------------

    def get_last_updated(self, keycloak_sub: str) -> float:
        """Return the epoch timestamp of the most recent measurement write
        for *keycloak_sub*, or 0.0 if no measurements exist.

        Used by the ``/api/db-mtime`` endpoint so the frontend only
        triggers a data refresh when something actually changed.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.

        Returns:
            Unix timestamp (float) of the latest ``updated_at``, or 0.0.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = sa.select(sa.func.max(measurements.c.updated_at)).where(
            measurements.c.user_id == user_id
        )
        with self._engine.connect() as conn:
            result = conn.execute(stmt).scalar()
        if result is None:
            return 0.0
        # result is a timezone-aware datetime; convert to a UTC epoch float.
        return result.timestamp()

    def get_all(self, keycloak_sub: str) -> pd.DataFrame:
        """Return all measurements for *keycloak_sub* sorted by date ascending.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.

        Returns:
            A ``pandas.DataFrame`` with columns ``date`` (datetime.date)
            and ``weight`` (float). Empty DataFrame when no data exists.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = (
            sa.select(measurements.c.date, measurements.c.weight)
            .where(measurements.c.user_id == user_id)
            .order_by(measurements.c.date.asc())
        )
        with self._engine.connect() as conn:
            rows = conn.execute(stmt).fetchall()
        if not rows:
            return pd.DataFrame(columns=["date", "weight"])
        df = pd.DataFrame(rows, columns=["date", "weight"])
        df["date"] = pd.to_datetime(df["date"])
        return df

    def get_date_range(
        self,
        keycloak_sub: str,
        start: datetime.date,
        end: datetime.date,
    ) -> pd.DataFrame:
        """Return measurements within *[start, end]* inclusive.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            start: Earliest date (inclusive).
            end: Latest date (inclusive).

        Returns:
            A ``pandas.DataFrame`` sorted by date.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = (
            sa.select(measurements.c.date, measurements.c.weight)
            .where(measurements.c.user_id == user_id)
            .where(measurements.c.date >= start)
            .where(measurements.c.date <= end)
            .order_by(measurements.c.date.asc())
        )
        with self._engine.connect() as conn:
            rows = conn.execute(stmt).fetchall()
        if not rows:
            return pd.DataFrame(columns=["date", "weight"])
        df = pd.DataFrame(rows, columns=["date", "weight"])
        df["date"] = pd.to_datetime(df["date"])
        return df

    # -- mutations ---------------------------------------------------------

    def add(self, keycloak_sub: str, date: datetime.date, weight: float) -> None:
        """Insert a new measurement for *keycloak_sub*.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            date: The measurement date.
            weight: Body weight in kilograms (must be 40--300).

        Raises:
            DuplicateDateError: If a measurement for *date* already exists
                for this user.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = measurements.insert().values(
            user_id=user_id,
            date=date,
            weight=weight,
            updated_at=sa.func.now(),
        )
        try:
            with self._engine.begin() as conn:
                conn.execute(stmt)
        except IntegrityError as exc:
            error_msg = str(exc).lower()
            if "unique" in error_msg or "duplicate" in error_msg:
                raise DuplicateDateError(
                    f"A measurement already exists for {date}"
                ) from exc
            if "check" in error_msg or "constraint" in error_msg:
                raise DuplicateDateError(
                    f"Weight {weight} kg is outside the allowed range (40-300 kg)"
                ) from exc
            raise  # pragma: no cover

    def update(
        self, keycloak_sub: str, date: datetime.date, weight: float
    ) -> None:
        """Update the weight for an existing measurement.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            date: The date of the measurement to update.
            weight: New body weight in kilograms (must be 40--300).

        Raises:
            NotFoundError: If no measurement exists for *date* and user.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = (
            measurements.update()
            .where(measurements.c.user_id == user_id)
            .where(measurements.c.date == date)
            .values(weight=weight, updated_at=sa.func.now())
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

    def remove_all(self, keycloak_sub: str) -> int:
        """Delete every measurement belonging to *keycloak_sub*.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.

        Returns:
            The number of rows deleted.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = measurements.delete().where(measurements.c.user_id == user_id)
        with self._engine.begin() as conn:
            result = conn.execute(stmt)
        return result.rowcount

    def remove(self, keycloak_sub: str, date: datetime.date) -> None:
        """Delete the measurement for the given date and user.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            date: The date of the measurement to remove.

        Raises:
            NotFoundError: If no measurement exists for *date* and user.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = measurements.delete().where(
            measurements.c.user_id == user_id,
            measurements.c.date == date,
        )
        with self._engine.begin() as conn:
            result = conn.execute(stmt)
            if result.rowcount == 0:
                raise NotFoundError(f"No measurement found for {date}")
