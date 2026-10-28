-- Migration: V12__add_offered_by_to_students.sql
-- Description: Add optional offered_by column (NSBM, Plymouth University, Victoria University, etc.) to students table

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS offered_by VARCHAR(100);
