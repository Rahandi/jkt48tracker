"""drop total_show_count from members

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-05-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c2d3e4f5a6b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('members', 'total_show_count')


def downgrade():
    op.add_column('members', sa.Column('total_show_count', sa.Integer(), nullable=True))
