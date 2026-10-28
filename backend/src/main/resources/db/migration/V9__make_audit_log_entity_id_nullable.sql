-- ==============================================================================
-- LabAttend Flyway Migration V9: Allow Null Entity ID in Audit Logs for Bulk Operations
-- ==============================================================================

ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
