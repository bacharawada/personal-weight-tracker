"""initial_schema

Creates the ``users`` and ``measurements`` tables with per-user data
isolation.  The ``users`` table stores Keycloak subject UUIDs and an
onboarding completion flag.  The ``measurements`` table references
``users.id`` with a CASCADE delete and enforces a unique (user, date)
constraint plus a weight range check.

Revision ID: d12c0225fb1b
Revises:
Create Date: 2026-04-24 16:44:50.481852
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d12c0225fb1b"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("keycloak_sub", sa.String(length=36), nullable=False),
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keycloak_sub"),
    )
    op.create_table(
        "measurements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.CheckConstraint("weight >= 40 AND weight <= 300", name="ck_weight_range"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_user_date"),
    )
    op.create_index(
        op.f("ix_measurements_user_id"), "measurements", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_measurements_user_id"), table_name="measurements")
    op.drop_table("measurements")
    op.drop_table("users")
