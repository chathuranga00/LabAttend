-- Migration: V13__allow_duplicate_batch_codes_across_programmes.sql
-- Description: Allow same batch code across different degree programmes (e.g. 2026.3 for SE, CS, MIS)

ALTER TABLE batches DROP CONSTRAINT IF EXISTS uq_batches_batch_code;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_batches_degree_programme_batch_code'
    ) THEN
        ALTER TABLE batches
            ADD CONSTRAINT uq_batches_degree_programme_batch_code UNIQUE (degree_programme_id, batch_code);
    END IF;
END $$;
