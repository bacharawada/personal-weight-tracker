"""add_date_format_preferences_to_users

Adds ``date_order`` and ``date_separator`` to ``users``. Dates stay stored as
DATE; these columns only drive frontend display, the same way
``unit_preference`` does for weights.

Revision ID: e7a9c3b15d82
Revises: c4e5f6a7b8d9
Create Date: 2026-07-25 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e7a9c3b15d82'
down_revision: str | None = 'c4e5f6a7b8d9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'date_order',
            sa.String(length=3),
            server_default='dmy',
            nullable=False,
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'date_separator',
            sa.String(length=1),
            server_default='/',
            nullable=False,
        ),
    )
    op.create_check_constraint(
        'ck_date_order',
        'users',
        "date_order IN ('dmy', 'mdy', 'ymd')",
    )
    op.create_check_constraint(
        'ck_date_separator',
        'users',
        "date_separator IN ('/', '-')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_date_separator', 'users', type_='check')
    op.drop_constraint('ck_date_order', 'users', type_='check')
    op.drop_column('users', 'date_separator')
    op.drop_column('users', 'date_order')
