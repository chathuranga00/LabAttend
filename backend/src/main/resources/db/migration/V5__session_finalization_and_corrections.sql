-- ==============================================================================
-- LabAttend Flyway Migration V5: Session Finalization & Attendance Corrections
-- Adds finalization timestamps to lab_sessions and correction metadata to attendance_records
-- ==============================================================================

-- 1. Add finalization timestamps to lab_sessions
ALTER TABLE lab_sessions
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lab_sessions_finalized_at ON lab_sessions (finalized_at);

-- 2. Add correction tracking columns to attendance_records
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS is_corrected BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS corrected_by UUID,
    ADD COLUMN IF NOT EXISTS previous_status VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_corrected_by'
    ) THEN
        ALTER TABLE attendance_records
            ADD CONSTRAINT fk_attendance_records_corrected_by
            FOREIGN KEY (corrected_by)
            REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_records_is_corrected ON attendance_records (is_corrected);
