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
    # -- Profile (all optional; populated via onboarding or settings) ------
    # Height in centimetres, used to compute BMI on the frontend.
    sa.Column("height_cm", sa.Float, nullable=True),
    # Target weight in kilograms (canonical unit; display conversion is a
    # frontend concern).
    sa.Column("goal_weight", sa.Float, nullable=True),
    # Optional date by which the user aims to reach goal_weight.
    sa.Column("target_date", sa.Date, nullable=True),
    # Preferred display unit for weights: 'kg' or 'lb'. Storage stays kg.
    sa.Column(
        "unit_preference",
        sa.String(3),
        nullable=False,
        server_default="kg",
    ),
    sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.CheckConstraint(
        "height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 300)",
        name="ck_height_range",
    ),
    sa.CheckConstraint(
        "goal_weight IS NULL OR (goal_weight >= 40 AND goal_weight <= 300)",
        name="ck_goal_weight_range",
    ),
    sa.CheckConstraint(
        "unit_preference IN ('kg', 'lb')",
        name="ck_unit_preference",
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
    # Optional free-text note attached to a single measurement (e.g. "after
    # vacation", "sick"). Purely descriptive — never used in analysis math.
    sa.Column("note", sa.String(500), nullable=True),
    # Tracks when this row was last written; used by /api/db-mtime so the
    # frontend can detect real data changes instead of polling time.time().
    sa.Column(
        "updated_at",
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.CheckConstraint("weight >= 40 AND weight <= 300", name="ck_weight_range"),
    # A user cannot have two measurements on the same date.
    sa.UniqueConstraint("user_id", "date", name="uq_user_date"),
)

# ``share_tokens`` backs the public read-only dashboard sharing feature.
# Each row is an opaque, URL-safe secret that resolves to a single user's
# data. Tokens are revocable (soft-delete via the ``revoked`` flag) so a
# leaked link can be killed without deleting history. At most one active
# (non-revoked) token per user is kept by the store layer.
share_tokens = sa.Table(
    "share_tokens",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column(
        "user_id",
        sa.Integer,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    # Opaque secret (secrets.token_urlsafe(32) → ~43 chars); unique so a
    # token resolves to exactly one user.
    sa.Column("token", sa.String(64), nullable=False, unique=True),
    sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    sa.Column(
        "revoked",
        sa.Boolean,
        nullable=False,
        server_default=sa.false(),
    ),
)

# ``medication_doses`` is a per-user journal of medication doses (GLP-1 and
# similar) that the frontend annotates onto the weight chart. Unlike
# ``measurements`` there is no unique-per-date constraint: a user may log
# several doses (different molecules) on the same day.
medication_doses = sa.Table(
    "medication_doses",
    metadata,
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    # FK to users.id — every dose belongs to exactly one user.
    sa.Column(
        "user_id",
        sa.Integer,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column("date", sa.Date, nullable=False),
    # Free-text molecule name (with frontend datalist suggestions); e.g.
    # "semaglutide", "tirzepatide". Free text is deliberately allowed.
    sa.Column("medication", sa.String(100), nullable=False),
    # Optional dose in milligrams. NUMERIC keeps the stored value exact;
    # the store layer converts it to a plain float for callers.
    sa.Column("dose_mg", sa.Numeric(7, 3), nullable=True),
    sa.Column("note", sa.String(300), nullable=True),
    # A positive dose when one is recorded (mirrors the API-level validation).
    sa.CheckConstraint(
        "dose_mg IS NULL OR dose_mg > 0",
        name="ck_dose_mg_positive",
    ),
    # Query pattern is always "this user's doses, ordered by date".
    sa.Index("ix_medication_doses_user_date", "user_id", "date"),
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
