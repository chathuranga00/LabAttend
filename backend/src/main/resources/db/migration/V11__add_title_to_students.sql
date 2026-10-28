-- Migration: V11__add_title_to_students.sql
-- Description: Add optional title column (Mr., Ms., etc.) to students table

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS title VARCHAR(20);
