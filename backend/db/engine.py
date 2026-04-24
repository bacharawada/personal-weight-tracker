"""SQLAlchemy Core engine, table schema, and domain exceptions.

Defines the ``users`` and ``measurements`` tables, the engine factory,
and the custom exceptions ``DuplicateDateError`` and ``NotFoundError``.

The database backend is PostgreSQL, configured via the ``DATABASE_URL``
environment variable (falls back to a local SQLite file for running
tests without a live Postgres instance — see conftest.py).
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import sqlalchemy as sa
from dotenv import load_dotenv

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine

# Load .env from the project root (no-op when env vars are already set,
# e.g. inside Docker).
load_dotenv()

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

metadata = sa.MetaData()

# ``users`` stores the Keycloak subject (``sub`` JWT claim) and a flag
# that tracks whether the user has completed the onboarding wizard.
# We deliberately avoid storing PII (name, email) here — Keycloak owns
# that data.
users = sa.Table(
    "users",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    # Keycloak subject UUID — globally unique per user across realms.
    sa.Column("keycloak_sub", sa.String(36), nullable=False, unique=True),
    sa.Column(
        "onboarding_completed",
        sa.Boolean,
        nullable=False,
        server_default=sa.false(),
    ),
    sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
)

measurements = sa.Table(
    "measurements",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    # FK to users.id — every measurement belongs to exactly one user.
    sa.Column(
        "user_id",
        sa.Integer,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    sa.Column("date", sa.Date, nullable=False),
    sa.Column(
        "weight",
        sa.Float,
        nullable=False,
    ),
    sa.CheckConstraint("weight >= 40 AND weight <= 300", name="ck_weight_range"),
    # A user cannot have two measurements on the same date.
    sa.UniqueConstraint("user_id", "date", name="uq_user_date"),
)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class DuplicateDateError(Exception):
    """Raised when inserting a measurement for a date that already exists."""


class NotFoundError(Exception):
    """Raised when attempting to access a measurement that does not exist."""


# ---------------------------------------------------------------------------
# Engine factory
# ---------------------------------------------------------------------------

# Environment variable name for the database connection string.
_DATABASE_URL_ENV = "DATABASE_URL"


def get_engine(database_url: str | None = None) -> Engine:
    """Create and return a SQLAlchemy engine.

    The connection string is resolved in this order:
    1. The ``database_url`` argument (explicit override, used in tests).
    2. The ``DATABASE_URL`` environment variable (Docker / production).

    Args:
        database_url: Optional explicit connection URL.  When ``None``
            the value of the ``DATABASE_URL`` environment variable is used.

    Returns:
        A configured ``sqlalchemy.engine.Engine`` instance.

    Raises:
        RuntimeError: If no connection URL can be determined.
    """
    url = database_url or os.environ.get(_DATABASE_URL_ENV)
    if not url:
        raise RuntimeError(
            "No database URL configured. "
            "Set the DATABASE_URL environment variable or pass database_url explicitly."
        )

    engine = sa.create_engine(url, pool_pre_ping=True)
    return engine
