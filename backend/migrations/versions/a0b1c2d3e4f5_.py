"""create contributions table

Revision ID: a0b1c2d3e4f5
Revises: f5b6c7d8e9a0
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contributions',
        sa.Column('contribution_type', sa.String(length=50), nullable=False),
        sa.Column('jkt48_schedule_id', sa.String(length=20), nullable=False),
        sa.Column('theater_schedule_id', sa.Integer(), nullable=True),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('contributor_name', sa.String(length=100), nullable=True),
        sa.Column('contributor_contact', sa.String(length=200), nullable=True),
        sa.Column('contributor_note', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.Column('deleted_at', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['theater_schedule_id'], ['theater_schedules.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_contributions_status_type', 'contributions', ['status', 'contribution_type'])


def downgrade() -> None:
    op.drop_index('ix_contributions_status_type', table_name='contributions')
    op.drop_table('contributions')
