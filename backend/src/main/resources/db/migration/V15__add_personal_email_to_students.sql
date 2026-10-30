-- ==============================================================================
-- LabAttend Flyway Migration V15: Add Personal Email to Students Table
-- ==============================================================================

-- 1. Add personal_email column to students table (optional)
ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);

-- 2. Create index for efficient search queries on personal email
CREATE INDEX IF NOT EXISTS idx_students_personal_email ON students (personal_email);

