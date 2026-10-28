-- ==============================================================================
-- LabAttend Flyway Migration V10: Make Degree Programme Code and Student Email Optional
-- ==============================================================================

-- 1. Allow null code in degree_programmes table
ALTER TABLE degree_programmes ALTER COLUMN code DROP NOT NULL;

-- 2. Allow null email in students table
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
