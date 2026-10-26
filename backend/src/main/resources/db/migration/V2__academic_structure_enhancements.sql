-- ==============================================================================
-- LabAttend Flyway Migration V2: Academic Structure Enhancements
-- Adds Degree Programme relationship to Modules, and Batch relationship to Lecturer Assignments
-- ==============================================================================

-- 1. Enhance Modules table with Degree Programme association and Year/Semester
ALTER TABLE modules
    ADD COLUMN IF NOT EXISTS degree_programme_id UUID,
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50),
    ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_modules_degree_programme'
    ) THEN
        ALTER TABLE modules
            ADD CONSTRAINT fk_modules_degree_programme
            FOREIGN KEY (degree_programme_id)
            REFERENCES degree_programmes (id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_modules_degree_programme ON modules (degree_programme_id);
CREATE INDEX IF NOT EXISTS idx_modules_semester ON modules (academic_year, semester);

-- 2. Enhance Lecturer Module Assignments with Batch association
ALTER TABLE lecturer_module_assignments
    ADD COLUMN IF NOT EXISTS batch_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lma_batch'
    ) THEN
        ALTER TABLE lecturer_module_assignments
            ADD CONSTRAINT fk_lma_batch
            FOREIGN KEY (batch_id)
            REFERENCES batches (id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lma_batch ON lecturer_module_assignments (batch_id);
