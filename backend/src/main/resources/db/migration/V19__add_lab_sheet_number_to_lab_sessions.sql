-- V19: Add optional lab_sheet_number to lab_sessions
ALTER TABLE lab_sessions
    ADD COLUMN IF NOT EXISTS lab_sheet_number VARCHAR(100);

COMMENT ON COLUMN lab_sessions.lab_sheet_number IS 'Optional identifier or title for the practical lab sheet (e.g., Lab Sheet 01)';
