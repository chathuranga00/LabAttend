-- Migration: V14__make_batches_university_wide_and_merge_duplicates.sql
-- Description: Make Batches university-wide intake cohorts, merge duplicate batches with identical batch codes,
-- and restore global uniqueness on batch_code while making degree_programme_id optional.

DO $$
DECLARE
    rec RECORD;
    dup_rec RECORD;
    canon_id UUID;
    canon_lg_id UUID;
    dup_lg RECORD;
BEGIN
    -- 1. For every distinct batch_code that has duplicates (case-insensitive)
    FOR rec IN
        SELECT UPPER(TRIM(batch_code)) AS code_key, COUNT(*) AS cnt
        FROM batches
        GROUP BY UPPER(TRIM(batch_code))
        HAVING COUNT(*) > 1
    LOOP
        -- Pick the canonical batch (oldest created_at, or lowest id)
        SELECT id INTO canon_id
        FROM batches
        WHERE UPPER(TRIM(batch_code)) = rec.code_key
        ORDER BY created_at ASC, id ASC
        LIMIT 1;

        -- Iterate over all other duplicates for this batch_code
        FOR dup_rec IN
            SELECT id FROM batches
            WHERE UPPER(TRIM(batch_code)) = rec.code_key
              AND id != canon_id
        LOOP
            -- Handle lab_groups of duplicate batch
            FOR dup_lg IN
                SELECT id, group_name FROM lab_groups WHERE batch_id = dup_rec.id
            LOOP
                -- Check if canonical batch already has a group with the same name
                SELECT id INTO canon_lg_id
                FROM lab_groups
                WHERE batch_id = canon_id AND UPPER(TRIM(group_name)) = UPPER(TRIM(dup_lg.group_name))
                LIMIT 1;

                IF canon_lg_id IS NOT NULL THEN
                    -- Re-point students to canonical lab group
                    UPDATE students SET lab_group_id = canon_lg_id WHERE lab_group_id = dup_lg.id;

                    -- Re-point sessions
                    UPDATE lab_sessions SET lab_group_id = canon_lg_id WHERE lab_group_id = dup_lg.id;

                    -- For lecturer_module_assignments, delete duplicate assignments if canonical already has it
                    DELETE FROM lecturer_module_assignments lma_dup
                    WHERE lab_group_id = dup_lg.id
                      AND EXISTS (
                          SELECT 1 FROM lecturer_module_assignments lma_canon
                          WHERE lma_canon.lab_group_id = canon_lg_id
                            AND lma_canon.lecturer_id = lma_dup.lecturer_id
                            AND lma_canon.module_id = lma_dup.module_id
                            AND lma_canon.academic_year = lma_dup.academic_year
                            AND lma_canon.semester = lma_dup.semester
                            AND lma_canon.batch_id = lma_dup.batch_id
                      );

                    UPDATE lecturer_module_assignments SET lab_group_id = canon_lg_id WHERE lab_group_id = dup_lg.id;
                    DELETE FROM lab_groups WHERE id = dup_lg.id;
                ELSE
                    -- Move the lab group over to the canonical batch
                    UPDATE lab_groups SET batch_id = canon_id WHERE id = dup_lg.id;
                END IF;
            END LOOP;

            -- Re-point students to canonical batch
            UPDATE students SET batch_id = canon_id WHERE batch_id = dup_rec.id;

            -- Re-point lecturer_module_assignments to canonical batch (remove duplicates first)
            DELETE FROM lecturer_module_assignments lma_dup
            WHERE batch_id = dup_rec.id
              AND EXISTS (
                  SELECT 1 FROM lecturer_module_assignments lma_canon
                  WHERE lma_canon.batch_id = canon_id
                    AND lma_canon.lecturer_id = lma_dup.lecturer_id
                    AND lma_canon.module_id = lma_dup.module_id
                    AND lma_canon.academic_year = lma_dup.academic_year
                    AND lma_canon.semester = lma_dup.semester
                    AND (
                        lma_canon.lab_group_id = lma_dup.lab_group_id 
                        OR (lma_canon.lab_group_id IS NULL AND lma_dup.lab_group_id IS NULL)
                    )
              );

            UPDATE lecturer_module_assignments SET batch_id = canon_id WHERE batch_id = dup_rec.id;

            -- Re-point lab sessions to canonical batch
            UPDATE lab_sessions SET batch_id = canon_id WHERE batch_id = dup_rec.id;

            -- Delete the duplicate batch record
            DELETE FROM batches WHERE id = dup_rec.id;
        END LOOP;
    END LOOP;
END $$;

-- 2. Make degree_programme_id optional on batches table
ALTER TABLE batches ALTER COLUMN degree_programme_id DROP NOT NULL;

-- 3. Drop degree_programme scoped unique constraint if it exists
ALTER TABLE batches DROP CONSTRAINT IF EXISTS uq_batches_degree_programme_batch_code;

-- 4. Restore global uniqueness on batch_code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_batches_batch_code'
    ) THEN
        ALTER TABLE batches ADD CONSTRAINT uq_batches_batch_code UNIQUE (batch_code);
    END IF;
END $$;
