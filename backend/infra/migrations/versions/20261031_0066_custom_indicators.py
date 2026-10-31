"""Custom chart indicators pasted into the admin panel.

An admin pastes a Pine Script (TradingView) or MQL4/MQL5 (MetaTrader)
indicator. The admin API converts it once into the Charting Library's own
custom-indicator JavaScript (`compiled_js`), the admin previews it on a live
chart, and Publish copies the draft into `published_js`. Both terminals load
the published rows through the gateway and register them with
`custom_indicators_getter`.

The draft and the published code are separate columns so re-converting or
editing a live indicator does not change what traders run until the admin
publishes again. `study_id` never changes after creation: it is the metainfo
id saved inside traders' chart layouts and study templates.

A conversion can take minutes, longer than the proxies in front of the admin
API wait, so it runs in the background; `conversion_state` tells the admin page
when to stop polling.

Revision ID: 0066
Revises: 0065
"""
from alembic import op

revision = "0066"
down_revision = "0065"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS custom_indicators (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name                 VARCHAR(120) NOT NULL,
            study_id             VARCHAR(80) NOT NULL UNIQUE,
            source_language      VARCHAR(10) NOT NULL DEFAULT 'pine',
            source_code          TEXT NOT NULL,
            compiled_js          TEXT,
            conversion_notes     JSONB NOT NULL DEFAULT '[]'::jsonb,
            unsupported_features JSONB NOT NULL DEFAULT '[]'::jsonb,
            conversion_state     VARCHAR(10) NOT NULL DEFAULT 'idle',
            conversion_error     TEXT,
            conversion_started_at TIMESTAMPTZ,
            status               VARCHAR(12) NOT NULL DEFAULT 'draft',
            published_js         TEXT,
            version              INTEGER NOT NULL DEFAULT 0,
            published_at         TIMESTAMPTZ,
            created_by           UUID REFERENCES users(id),
            updated_by           UUID REFERENCES users(id),
            created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT custom_indicators_status_check
                CHECK (status IN ('draft', 'published', 'disabled')),
            CONSTRAINT custom_indicators_conversion_check
                CHECK (conversion_state IN ('idle', 'running', 'failed')),
            CONSTRAINT custom_indicators_language_check
                CHECK (source_language IN ('pine', 'mql4', 'mql5'))
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS custom_indicators")
