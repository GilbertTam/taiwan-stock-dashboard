"""Add user_presets table

Revision ID: 002_add_user_presets
Revises: initial_001
Create Date: 2026-04-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_user_presets'
down_revision = 'initial_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('user_presets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('page_key', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('data', sa.Text(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'page_key', 'name', name='uq_user_page_preset_name'),
    )
    op.create_index(op.f('ix_user_presets_id'), 'user_presets', ['id'], unique=False)
    op.create_index(op.f('ix_user_presets_user_id'), 'user_presets', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_presets_user_id'), table_name='user_presets')
    op.drop_index(op.f('ix_user_presets_id'), table_name='user_presets')
    op.drop_table('user_presets')
