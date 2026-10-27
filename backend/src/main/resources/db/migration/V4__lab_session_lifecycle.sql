-- ==============================================================================
-- LabAttend Flyway Migration V4: Laboratory Session Lifecycle & Cohort Tracking
-- Adds Batch cohort association, lifecycle timestamps, cancellation reason,
-- and updates status check constraint to support DRAFT and FINALIZED.
-- ==============================================================================

-- 1. Add batch cohort association to lab_sessions
ALTER TABLE lab_sessions
    ADD COLUMN IF NOT EXISTS batch_id UUID,
    ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lab_sessions_batch'
    ) THEN
        ALTER TABLE lab_sessions
            ADD CONSTRAINT fk_lab_sessions_batch
            FOREIGN KEY (batch_id)
            REFERENCES batches (id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_sessions_batch ON lab_sessions (batch_id);

-- 2. Update status constraint to support full state machine:
-- DRAFT / SCHEDULED -> ACTIVE -> FINALIZED / CLOSED, DRAFT / ACTIVE -> CANCELLED
ALTER TABLE lab_sessions DROP CONSTRAINT IF EXISTS chk_lab_sessions_status;

ALTER TABLE lab_sessions ADD CONSTRAINT chk_lab_sessions_status
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'FINALIZED', 'CLOSED', 'CANCELLED'));

ALTER TABLE lab_sessions ALTER COLUMN status SET DEFAULT 'DRAFT';
