-- ==============================================================================
-- LabAttend Flyway Migration V3: Lecturer Password Management Enhancements
-- ==============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
