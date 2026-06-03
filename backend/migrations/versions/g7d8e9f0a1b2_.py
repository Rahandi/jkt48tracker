"""add graduated_at to members

Revision ID: g7d8e9f0a1b2
Revises: f5b6c7d8e9a0
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g7d8e9f0a1b2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('members', sa.Column('graduated_at', sa.Integer(), nullable=True))
    op.create_index('ix_members_graduated_at', 'members', ['graduated_at'])


def downgrade() -> None:
    op.drop_index('ix_members_graduated_at', table_name='members')
    op.drop_column('members', 'graduated_at')
