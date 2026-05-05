"""widen jkt48_id to 50 chars

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('members', 'jkt48_id',
                    existing_type=sa.String(length=20),
                    type_=sa.String(length=50),
                    nullable=False)


def downgrade() -> None:
    op.alter_column('members', 'jkt48_id',
                    existing_type=sa.String(length=50),
                    type_=sa.String(length=20),
                    nullable=False)
