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

from db.engine import (
    DuplicateDateError,
    NotFoundError,
    measurements,
    medication_doses,
    users,
)

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
            Dict with keys ``id``, ``keycloak_sub``, ``onboarding_completed``,
            ``height_cm``, ``goal_weight``, ``target_date``, and
            ``unit_preference``.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        with self._engine.connect() as conn:
            row = conn.execute(
                sa.select(
                    users.c.id,
                    users.c.keycloak_sub,
                    users.c.onboarding_completed,
                    users.c.height_cm,
                    users.c.goal_weight,
                    users.c.target_date,
                    users.c.unit_preference,
                ).where(users.c.id == user_id)
            ).fetchone()
        if row is None:
            raise NotFoundError(f"User not found: {keycloak_sub}")  # pragma: no cover
        return {
            "id": row[0],
            "keycloak_sub": row[1],
            "onboarding_completed": row[2],
            "height_cm": row[3],
            "goal_weight": row[4],
            "target_date": row[5],
            "unit_preference": row[6],
        }

    def update_profile(self, keycloak_sub: str, fields: dict) -> None:
        """Update profile fields for *keycloak_sub*.

        Only the keys present in *fields* are written, so callers can
        perform partial (PATCH-style) updates. Allowed keys: ``height_cm``,
        ``goal_weight``, ``target_date``, ``unit_preference``. A ``None``
        value clears the corresponding column.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            fields: Mapping of column names to new values.
        """
        allowed = {"height_cm", "goal_weight", "target_date", "unit_preference"}
        values = {k: v for k, v in fields.items() if k in allowed}
        if not values:
            return
        user_id = self.get_or_create_user(keycloak_sub)
        with self._engine.begin() as conn:
            conn.execute(
                users.update().where(users.c.id == user_id).values(**values)
            )

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

    # -- medication doses --------------------------------------------------

    @staticmethod
    def _dose_row_to_dict(row: sa.Row) -> dict:
        """Convert a ``medication_doses`` result row into a plain dict.

        ``dose_mg`` is stored as SQL ``NUMERIC`` and comes back as
        ``Decimal``; it is normalised to a plain ``float`` (or ``None``) so
        callers never deal with ``Decimal``.

        Args:
            row: A row with ``id``, ``date``, ``medication``, ``dose_mg`` and
                ``note`` columns.

        Returns:
            Dict with keys ``id``, ``date``, ``medication``, ``dose_mg``,
            ``note``.
        """
        return {
            "id": int(row.id),
            "date": row.date,
            "medication": row.medication,
            "dose_mg": None if row.dose_mg is None else float(row.dose_mg),
            "note": row.note,
        }

    def add_dose(
        self,
        keycloak_sub: str,
        date: datetime.date,
        medication: str,
        dose_mg: float | None = None,
        note: str | None = None,
    ) -> dict:
        """Insert a new medication dose for *keycloak_sub*.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            date: The dose date.
            medication: Molecule name (free text, 1--100 chars).
            dose_mg: Optional dose in milligrams (must be > 0 when given).
            note: Optional free-text note (up to 300 chars).

        Returns:
            The created dose as a dict (``id``, ``date``, ``medication``,
            ``dose_mg``, ``note``).
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = medication_doses.insert().values(
            user_id=user_id,
            date=date,
            medication=medication,
            dose_mg=dose_mg,
            note=note,
        )
        with self._engine.begin() as conn:
            result = conn.execute(stmt)
            dose_id = int(result.inserted_primary_key[0])
        return {
            "id": dose_id,
            "date": date,
            "medication": medication,
            "dose_mg": dose_mg,
            "note": note,
        }

    def list_doses(
        self,
        keycloak_sub: str,
        start: datetime.date | None = None,
        end: datetime.date | None = None,
    ) -> list[dict]:
        """Return the user's medication doses, optionally filtered by date.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            start: Earliest date (inclusive). Omit for no lower bound.
            end: Latest date (inclusive). Omit for no upper bound.

        Returns:
            List of dose dicts sorted by date ascending, then id ascending.
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = sa.select(
            medication_doses.c.id,
            medication_doses.c.date,
            medication_doses.c.medication,
            medication_doses.c.dose_mg,
            medication_doses.c.note,
        ).where(medication_doses.c.user_id == user_id)
        if start is not None:
            stmt = stmt.where(medication_doses.c.date >= start)
        if end is not None:
            stmt = stmt.where(medication_doses.c.date <= end)
        stmt = stmt.order_by(
            medication_doses.c.date.asc(), medication_doses.c.id.asc()
        )
        with self._engine.connect() as conn:
            rows = conn.execute(stmt).fetchall()
        return [self._dose_row_to_dict(row) for row in rows]

    def delete_dose(self, keycloak_sub: str, dose_id: int) -> None:
        """Delete a medication dose owned by *keycloak_sub*.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            dose_id: The primary key of the dose to remove.

        Raises:
            NotFoundError: If no dose with *dose_id* exists for this user
                (covers both a missing dose and one owned by another user).
        """
        user_id = self.get_or_create_user(keycloak_sub)
        stmt = medication_doses.delete().where(
            medication_doses.c.user_id == user_id,
            medication_doses.c.id == dose_id,
        )
        with self._engine.begin() as conn:
            result = conn.execute(stmt)
            if result.rowcount == 0:
                raise NotFoundError(f"No medication dose found with id {dose_id}")

    def update_dose(
        self,
        keycloak_sub: str,
        dose_id: int,
        fields: dict,
    ) -> dict:
        """Update fields of a medication dose owned by *keycloak_sub*.

        Only the keys present in *fields* are written (partial update).
        Allowed keys: ``date``, ``medication``, ``dose_mg``, ``note``. A
        ``None`` value clears ``dose_mg`` or ``note``.

        Args:
            keycloak_sub: The ``sub`` claim from the Keycloak JWT.
            dose_id: The primary key of the dose to update.
            fields: Mapping of column names to new values.

        Returns:
            The updated dose as a dict.

        Raises:
            NotFoundError: If no dose with *dose_id* exists for this user.
        """
        allowed = {"date", "medication", "dose_mg", "note"}
        values = {k: v for k, v in fields.items() if k in allowed}
        user_id = self.get_or_create_user(keycloak_sub)
        with self._engine.begin() as conn:
            if values:
                update_stmt = (
                    medication_doses.update()
                    .where(medication_doses.c.user_id == user_id)
                    .where(medication_doses.c.id == dose_id)
                    .values(**values)
                )
                result = conn.execute(update_stmt)
                if result.rowcount == 0:
                    raise NotFoundError(
                        f"No medication dose found with id {dose_id}"
                    )
            row = conn.execute(
                sa.select(
                    medication_doses.c.id,
                    medication_doses.c.date,
                    medication_doses.c.medication,
                    medication_doses.c.dose_mg,
                    medication_doses.c.note,
                )
                .where(medication_doses.c.user_id == user_id)
                .where(medication_doses.c.id == dose_id)
            ).fetchone()
        if row is None:
            raise NotFoundError(f"No medication dose found with id {dose_id}")
        return self._dose_row_to_dict(row)
