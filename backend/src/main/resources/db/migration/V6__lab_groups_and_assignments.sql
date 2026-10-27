-- ==============================================================================
-- LabAttend Flyway Migration V6: Lab Groups, Scoped Assignments & Historical Snapshots
-- ==============================================================================

-- 1. Create lab_groups table
CREATE TABLE IF NOT EXISTS lab_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    group_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lab_groups_batch_name UNIQUE (batch_id, group_name),
    CONSTRAINT fk_lab_groups_batch FOREIGN KEY (batch_id)
        REFERENCES batches (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lab_groups_batch ON lab_groups (batch_id);
CREATE INDEX IF NOT EXISTS idx_lab_groups_name ON lab_groups (group_name);
CREATE INDEX IF NOT EXISTS idx_lab_groups_active ON lab_groups (is_active);

-- 2. Add lab_group_id to students table
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS lab_group_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_lab_group'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT fk_students_lab_group
            FOREIGN KEY (lab_group_id)
            REFERENCES lab_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_lab_group ON students (lab_group_id);

-- 3. Add lab_group_id to lecturer_module_assignments table
ALTER TABLE lecturer_module_assignments
    ADD COLUMN IF NOT EXISTS lab_group_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lma_lab_group'
    ) THEN
        ALTER TABLE lecturer_module_assignments
            ADD CONSTRAINT fk_lma_lab_group
            FOREIGN KEY (lab_group_id)
            REFERENCES lab_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lma_lab_group ON lecturer_module_assignments (lab_group_id);

-- Drop legacy uniqueness constraint from V1 if it exists
ALTER TABLE lecturer_module_assignments DROP CONSTRAINT IF EXISTS uq_lecturer_module_sem;

-- Recreate uniqueness with partial indexes to handle nullable lab_group_id cleanly
CREATE UNIQUE INDEX IF NOT EXISTS uq_lma_with_group
    ON lecturer_module_assignments (lecturer_id, module_id, academic_year, semester, batch_id, lab_group_id)
    WHERE lab_group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lma_null_group
    ON lecturer_module_assignments (lecturer_id, module_id, academic_year, semester, batch_id)
    WHERE lab_group_id IS NULL;

-- 4. Add lab_group_id to lab_sessions table
ALTER TABLE lab_sessions
    ADD COLUMN IF NOT EXISTS lab_group_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lab_sessions_lab_group'
    ) THEN
        ALTER TABLE lab_sessions
            ADD CONSTRAINT fk_lab_sessions_lab_group
            FOREIGN KEY (lab_group_id)
            REFERENCES lab_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_sessions_lab_group ON lab_sessions (lab_group_id);

-- 5. Add home_lab_group_id to session_students table (historical snapshot of student's group)
ALTER TABLE session_students
    ADD COLUMN IF NOT EXISTS home_lab_group_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_session_students_home_lab_group'
    ) THEN
        ALTER TABLE session_students
            ADD CONSTRAINT fk_session_students_home_lab_group
            FOREIGN KEY (home_lab_group_id)
            REFERENCES lab_groups (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_students_home_lab_group ON session_students (home_lab_group_id);
