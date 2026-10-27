-- ==============================================================================
-- LabAttend Flyway Migration V8: Cross-Group Attendance Support
-- ==============================================================================

-- 1. Add cross-group tracking columns to attendance_records
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS is_cross_group BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS home_lab_group_id UUID,
    ADD COLUMN IF NOT EXISTS cross_group_note TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_home_lab_group'
    ) THEN
        ALTER TABLE attendance_records
            ADD CONSTRAINT fk_attendance_records_home_lab_group
            FOREIGN KEY (home_lab_group_id)
            REFERENCES lab_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_records_cross_group ON attendance_records (is_cross_group);
CREATE INDEX IF NOT EXISTS idx_attendance_records_home_group ON attendance_records (home_lab_group_id);

-- 2. Add is_expected to session_students table
ALTER TABLE session_students
    ADD COLUMN IF NOT EXISTS is_expected BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_session_students_expected ON session_students (session_id, is_expected);
