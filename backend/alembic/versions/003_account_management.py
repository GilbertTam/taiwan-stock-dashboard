"""Account management: OAuth, app settings, pending status, nullable password

Revision ID: 003_account_management
Revises: 002_add_user_presets
Create Date: 2026-05-18

Changes:
1. Create `app_settings` (singleton row id=1) for runtime-mutable toggles:
   - allow_registration (default False)
   - require_admin_approval (default True)
   Seeded with the single row by `bulk_insert` so the row always exists.

2. Create `oauth_accounts` to store linked third-party identities. Unique on
   (provider, provider_subject) so the same OIDC `sub` can never be linked
   twice; ON DELETE CASCADE so deleting a user removes their links.

3. Alter `users` via `batch_alter_table` (mandatory on SQLite — no
   `ALTER COLUMN` support; batch mode rebuilds the table copying data):
     - `hashed_password` → nullable (enables OAuth-only accounts)
     - add `is_pending` (default 0) to distinguish pending-approval users
       from admin-deactivated users (both have is_active=False).
   Existing user rows preserve their password hashes and get is_pending=0.

Downgrade reverses the schema. NOTE: setting hashed_password back to NOT NULL
will fail if any OAuth-only NULL-password rows exist — this is expected and
acceptable for a down-migration.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_account_management'
down_revision = '002_add_user_presets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) app_settings singleton
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('allow_registration', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('require_admin_approval', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    # Seed the singleton row so application code can assume it exists.
    op.bulk_insert(
        sa.table(
            'app_settings',
            sa.column('id', sa.Integer),
            sa.column('allow_registration', sa.Boolean),
            sa.column('require_admin_approval', sa.Boolean),
        ),
        [{'id': 1, 'allow_registration': False, 'require_admin_approval': True}],
    )

    # 2) oauth_accounts
    op.create_table(
        'oauth_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=20), nullable=False),
        sa.Column('provider_subject', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', 'provider_subject', name='uq_oauth_provider_subject'),
    )
    op.create_index(op.f('ix_oauth_accounts_id'), 'oauth_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_oauth_accounts_user_id'), 'oauth_accounts', ['user_id'], unique=False)

    # 3) users: nullable hashed_password + new is_pending column.
    # SQLite has no ALTER COLUMN; batch_alter_table rebuilds the table copying
    # existing rows verbatim (passwords preserved, new column defaulted to 0).
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('hashed_password', existing_type=sa.String(), nullable=True)
        batch_op.add_column(
            sa.Column('is_pending', sa.Boolean(), nullable=False, server_default=sa.text('0'))
        )


def downgrade() -> None:
    # Reverse user changes first so the down path mirrors the up path.
    # NOTE: alter_column back to nullable=False will FAIL if any OAuth-only
    # rows have NULL hashed_password — expected; remove such rows manually
    # before downgrading if needed.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_pending')
        batch_op.alter_column('hashed_password', existing_type=sa.String(), nullable=False)

    op.drop_index(op.f('ix_oauth_accounts_user_id'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_oauth_accounts_id'), table_name='oauth_accounts')
    op.drop_table('oauth_accounts')

    op.drop_table('app_settings')
