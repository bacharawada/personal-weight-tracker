"""add_appearance_preferences_to_users

Moves theme, chart palette and UI language off the browser's localStorage and
onto the user row, so they follow the account across devices.

``language`` is nullable on purpose: NULL means "never picked one", and the
frontend keeps detecting it from the browser in that case. ``palette`` carries
no CHECK constraint — the palette catalogue lives in the frontend and falls
back to 'Classic' for an unknown name, so adding a palette needs no migration.

Revision ID: f3b8d0e6417a
Revises: e7a9c3b15d82
Create Date: 2026-07-25 11:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f3b8d0e6417a'
down_revision: str | None = 'e7a9c3b15d82'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'theme',
            sa.String(length=5),
            server_default='light',
            nullable=False,
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'palette',
            sa.String(length=20),
            server_default='Classic',
            nullable=False,
        ),
    )
    op.add_column('users', sa.Column('language', sa.String(length=2), nullable=True))
    op.create_check_constraint(
        'ck_theme',
        'users',
        "theme IN ('light', 'dark')",
    )
    op.create_check_constraint(
        'ck_language',
        'users',
        "language IS NULL OR language IN ('en', 'fr')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_language', 'users', type_='check')
    op.drop_constraint('ck_theme', 'users', type_='check')
    op.drop_column('users', 'language')
    op.drop_column('users', 'palette')
    op.drop_column('users', 'theme')
