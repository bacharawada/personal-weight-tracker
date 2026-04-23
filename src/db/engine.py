"""SQLAlchemy Core engine, table schema, and domain exceptions.

Defines the ``measurements`` table, the engine factory, and the custom
exceptions ``DuplicateDateError`` and ``NotFoundError``.  No other
module in the application should construct SQL or perform file
operations on the database directly.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

import sqlalchemy as sa

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

metadata = sa.MetaData()

measurements = sa.Table(
    "measurements",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column("date", sa.Date, nullable=False, unique=True),
    sa.Column(
        "weight",
        sa.Float,
        nullable=False,
        # NOTE: SQLite honours CHECK constraints since 3.25. We enforce a
        # sane physiological range at the DB level so invalid data can never
        # slip in, regardless of the entry path (UI, script, raw SQL).
        info={"check": "weight >= 40 AND weight <= 300"},
    ),
    sa.CheckConstraint("weight >= 40 AND weight <= 300", name="ck_weight_range"),
)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class DuplicateDateError(Exception):
    """Raised when inserting a measurement for a date that already exists."""


class NotFoundError(Exception):
    """Raised when attempting to delete a measurement that does not exist."""


# ---------------------------------------------------------------------------
# Engine factory
# ---------------------------------------------------------------------------

_DEFAULT_DB_PATH = Path("data") / "weight_tracker.db"


def get_engine(db_path: str | Path | None = None) -> Engine:
    """Create and return a SQLAlchemy engine for the weight tracker database.

    Args:
        db_path: Path to the SQLite database file. When ``None`` the default
            location ``data/weight_tracker.db`` (relative to the working
            directory) is used.

    Returns:
        A ``sqlalchemy.engine.Engine`` instance configured for SQLite.
    """
    if db_path is None:
        db_path = _DEFAULT_DB_PATH
    db_path = Path(db_path)

    # Ensure parent directory exists so SQLite can create the file.
    db_path.parent.mkdir(parents=True, exist_ok=True)

    url = f"sqlite:///{db_path}"
    engine = sa.create_engine(
        url,
        # NOTE: check_same_thread=False is required when the SQLite
        # connection is shared across Dash callback threads.
        connect_args={"check_same_thread": False},
    )

    # Ensure CHECK constraints are enforced (SQLite requires PRAGMA).
    @sa.event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_conn: object, _connection_record: object) -> None:
        cursor = dbapi_conn.cursor()  # type: ignore[union-attr]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def get_db_mtime(db_path: str | Path | None = None) -> float:
    """Return the modification time of the database file.

    Args:
        db_path: Path to the SQLite database file. Defaults to the
            standard location.

    Returns:
        The file's ``st_mtime`` as a float, or ``0.0`` if the file does
        not exist.
    """
    if db_path is None:
        db_path = _DEFAULT_DB_PATH
    try:
        return os.path.getmtime(db_path)
    except OSError:
        return 0.0
