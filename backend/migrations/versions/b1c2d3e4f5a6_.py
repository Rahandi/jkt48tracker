"""add total_show_count to members

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-05-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b1c2d3e4f5a6'
down_revision = 'a0b1c2d3e4f5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('members', sa.Column('total_show_count', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('members', 'total_show_count')
