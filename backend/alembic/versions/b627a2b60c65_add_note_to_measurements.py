"""add_note_to_measurements

Adds an optional free-text note column to ``measurements``. Notes are
plain user-supplied text (validated and trimmed at the API layer) and
carry no analysis meaning — they are pass-through data rendered as-is.

Revision ID: b627a2b60c65
Revises: a3f1c2d4e5f6
Create Date: 2026-07-13 09:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b627a2b60c65'
down_revision: str | None = 'a3f1c2d4e5f6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('measurements', sa.Column('note', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('measurements', 'note')
