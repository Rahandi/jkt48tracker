"""change dob to DATE, add index on deleted_at

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('members', 'dob',
                    existing_type=sa.String(length=10),
                    type_=sa.Date(),
                    nullable=True,
                    postgresql_using='dob::date')
    op.create_index('ix_members_deleted_at', 'members', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_members_deleted_at', table_name='members')
    op.alter_column('members', 'dob',
                    existing_type=sa.Date(),
                    type_=sa.String(length=10),
                    nullable=True)
