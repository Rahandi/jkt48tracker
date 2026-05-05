"""add jkt48_id and image_url to members, relax nullable constraints

Revision ID: c1d2e3f4a5b6
Revises: 2e27d245d57c
Create Date: 2026-05-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = '2e27d245d57c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('members', sa.Column('jkt48_id', sa.String(length=20), nullable=True))
    op.add_column('members', sa.Column('image_url', sa.String(length=255), nullable=True))
    op.create_unique_constraint('uq_members_jkt48_id', 'members', ['jkt48_id'])

    op.alter_column('members', 'name', existing_type=sa.String(length=50), type_=sa.String(length=100), nullable=False)
    op.alter_column('members', 'nickname', existing_type=sa.String(length=50), nullable=True)
    op.alter_column('members', 'dob', existing_type=sa.String(length=8), type_=sa.String(length=10), nullable=True)
    op.alter_column('members', 'height', existing_type=sa.Integer(), nullable=True)
    op.alter_column('members', 'blood_type', existing_type=sa.String(length=2), nullable=True)
    op.alter_column('members', 'horoscope', existing_type=sa.String(length=20), nullable=True)
    op.alter_column('members', 'twitter', existing_type=sa.String(length=50), type_=sa.String(length=100), nullable=True)
    op.alter_column('members', 'instagram', existing_type=sa.String(length=50), type_=sa.String(length=100), nullable=True)


def downgrade() -> None:
    op.drop_constraint('uq_members_jkt48_id', 'members', type_='unique')
    op.drop_column('members', 'image_url')
    op.drop_column('members', 'jkt48_id')

    op.alter_column('members', 'name', existing_type=sa.String(length=100), type_=sa.String(length=50), nullable=False)
    op.alter_column('members', 'nickname', existing_type=sa.String(length=50), nullable=False)
    op.alter_column('members', 'dob', existing_type=sa.String(length=10), type_=sa.String(length=8), nullable=False)
    op.alter_column('members', 'height', existing_type=sa.Integer(), nullable=False)
    op.alter_column('members', 'blood_type', existing_type=sa.String(length=2), nullable=False)
    op.alter_column('members', 'horoscope', existing_type=sa.String(length=20), nullable=False)
    op.alter_column('members', 'twitter', existing_type=sa.String(length=100), type_=sa.String(length=50), nullable=False)
    op.alter_column('members', 'instagram', existing_type=sa.String(length=100), type_=sa.String(length=50), nullable=False)
