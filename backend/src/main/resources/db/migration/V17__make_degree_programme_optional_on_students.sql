-- V17: Make degree_programme_id optional on students table
ALTER TABLE students ALTER COLUMN degree_programme_id DROP NOT NULL;
