"""Add user_preferences table

Revision ID: 004_user_preferences
Revises: 003_account_management
Create Date: 2026-05-27

Adds a singleton-per-user `user_preferences` table for storing UI
preferences that auto-sync to the backend (as opposed to named presets
which require an explicit save).

`data` is a free-form JSON blob — fields are defined by the frontend
and the backend does not validate their inner shape.
"""
from alembic import op
import sqlalchemy as sa


revision = '004_user_preferences'
down_revision = '003_account_management'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('data', sa.Text(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_preferences_user_id'),
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')
