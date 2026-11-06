-- ==============================================================================
-- LabAttend Database Migration V22: Add updated_at to account_activation_tokens
-- ==============================================================================

ALTER TABLE account_activation_tokens
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
