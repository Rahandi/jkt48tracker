"""create theater_schedules and theater_schedule_members tables

Revision ID: f5b6c7d8e9a0
Revises: e3f4a5b6c7d8
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5b6c7d8e9a0'
down_revision: Union[str, None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'theater_schedules',
        sa.Column('jkt48_schedule_id', sa.String(length=20), nullable=False),
        sa.Column('show_date', sa.Date(), nullable=True),
        sa.Column('show_time', sa.String(length=10), nullable=True),
        sa.Column('setlist_name', sa.String(length=200), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.Column('deleted_at', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('jkt48_schedule_id', name='uq_theater_schedules_jkt48_schedule_id'),
    )
    op.create_index('ix_theater_schedules_deleted_at', 'theater_schedules', ['deleted_at'])
    op.create_index('ix_theater_schedules_show_date', 'theater_schedules', ['show_date'])

    op.create_table(
        'theater_schedule_members',
        sa.Column('theater_schedule_id', sa.Integer(), nullable=False),
        sa.Column('jkt48_id', sa.String(length=50), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.Column('deleted_at', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['theater_schedule_id'], ['theater_schedules.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_theater_schedule_members_schedule_id',
        'theater_schedule_members',
        ['theater_schedule_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_theater_schedule_members_schedule_id', table_name='theater_schedule_members')
    op.drop_table('theater_schedule_members')
    op.drop_index('ix_theater_schedules_show_date', table_name='theater_schedules')
    op.drop_index('ix_theater_schedules_deleted_at', table_name='theater_schedules')
    op.drop_table('theater_schedules')
