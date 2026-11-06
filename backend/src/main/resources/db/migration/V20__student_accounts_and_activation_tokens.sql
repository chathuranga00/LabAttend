-- ==============================================================================
-- LabAttend Database Migration V20: Student Accounts & Activation Tokens
-- ==============================================================================

-- 1. Allow 'STUDENT' role in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT'));

-- 2. Link student records to login users (nullable, unique 1-to-1)
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_user'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id)
            REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_students_user_id'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT uq_students_user_id UNIQUE (user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);

-- 3. Account Activation & Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS account_activation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('ACTIVATION', 'PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activation_tokens_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_activation_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_activation_tokens_user_id ON account_activation_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_token_hash ON account_activation_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_purpose ON account_activation_tokens (purpose);

