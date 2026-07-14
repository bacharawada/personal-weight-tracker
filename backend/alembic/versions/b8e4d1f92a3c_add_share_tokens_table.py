"""add_share_tokens_table

Adds the ``share_tokens`` table backing the public read-only dashboard
sharing feature. Each row is an opaque, revocable URL-safe token scoped
to a single user via ``user_id`` (FK to ``users.id`` ON DELETE CASCADE).

Revision ID: b8e4d1f92a3c
Revises: a3f1c2d4e5f6
Create Date: 2026-07-13 09:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8e4d1f92a3c'
down_revision: str | None = 'a3f1c2d4e5f6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'share_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'revoked',
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token', name='uq_share_tokens_token'),
    )
    op.create_index(
        'ix_share_tokens_user_id', 'share_tokens', ['user_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_share_tokens_user_id', table_name='share_tokens')
    op.drop_table('share_tokens')
