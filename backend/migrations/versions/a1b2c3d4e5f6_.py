"""widen theater_schedule_members.jkt48_id to VARCHAR(100)

Revision ID: a1b2c3d4e5f6
Revises: f5b6c7d8e9a0
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f5b6c7d8e9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'theater_schedule_members',
        'jkt48_id',
        existing_type=sa.String(length=50),
        type_=sa.String(length=100),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'theater_schedule_members',
        'jkt48_id',
        existing_type=sa.String(length=100),
        type_=sa.String(length=50),
        existing_nullable=True,
    )
