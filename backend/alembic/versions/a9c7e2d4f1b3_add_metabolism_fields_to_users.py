"""add_metabolism_fields_to_users

Adds the three optional inputs the basal-metabolic-rate (BMR) and total daily
energy expenditure (TDEE) estimate needs on top of height and weight: biological
sex and date of birth for the Mifflin-St Jeor formula, and a physical-activity
level for the BMR -> TDEE multiplier.

All three are nullable: the metabolism card simply asks for what is missing.
``sex`` is a formula input, not an identity field, and is never exposed on the
public share endpoints.

Revision ID: a9c7e2d4f1b3
Revises: f3b8d0e6417a
Create Date: 2026-09-17 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a9c7e2d4f1b3'
down_revision: str | None = 'f3b8d0e6417a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('sex', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('birth_date', sa.Date(), nullable=True))
    op.add_column(
        'users',
        sa.Column('activity_level', sa.String(length=11), nullable=True),
    )
    op.create_check_constraint(
        'ck_sex',
        'users',
        "sex IS NULL OR sex IN ('male', 'female')",
    )
    op.create_check_constraint(
        'ck_activity_level',
        'users',
        "activity_level IS NULL OR activity_level IN "
        "('sedentary', 'light', 'moderate', 'active', 'very_active')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_activity_level', 'users', type_='check')
    op.drop_constraint('ck_sex', 'users', type_='check')
    op.drop_column('users', 'activity_level')
    op.drop_column('users', 'birth_date')
    op.drop_column('users', 'sex')
