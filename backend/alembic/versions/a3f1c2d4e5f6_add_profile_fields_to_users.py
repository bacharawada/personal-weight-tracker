"""add_profile_fields_to_users

Adds optional profile columns to ``users``: height_cm, goal_weight,
target_date, and unit_preference. Weights remain stored in kilograms;
``unit_preference`` only affects frontend display.

Revision ID: a3f1c2d4e5f6
Revises: 26e2b6876f8d
Create Date: 2026-06-21 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3f1c2d4e5f6'
down_revision: str | None = '26e2b6876f8d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('height_cm', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('goal_weight', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('target_date', sa.Date(), nullable=True))
    op.add_column(
        'users',
        sa.Column(
            'unit_preference',
            sa.String(length=3),
            server_default='kg',
            nullable=False,
        ),
    )
    op.create_check_constraint(
        'ck_height_range',
        'users',
        'height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 300)',
    )
    op.create_check_constraint(
        'ck_goal_weight_range',
        'users',
        'goal_weight IS NULL OR (goal_weight >= 40 AND goal_weight <= 300)',
    )
    op.create_check_constraint(
        'ck_unit_preference',
        'users',
        "unit_preference IN ('kg', 'lb')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_unit_preference', 'users', type_='check')
    op.drop_constraint('ck_goal_weight_range', 'users', type_='check')
    op.drop_constraint('ck_height_range', 'users', type_='check')
    op.drop_column('users', 'unit_preference')
    op.drop_column('users', 'target_date')
    op.drop_column('users', 'goal_weight')
    op.drop_column('users', 'height_cm')
