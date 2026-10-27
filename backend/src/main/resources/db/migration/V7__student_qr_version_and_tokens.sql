-- ==============================================================================
-- Flyway Database Migration: V7__student_qr_version_and_tokens.sql
-- Description: Step 13 QR Code generation, version tracking, and timestamp
-- ==============================================================================

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS qr_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_students_qr_version ON students (qr_version);
