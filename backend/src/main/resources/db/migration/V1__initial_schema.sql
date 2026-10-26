-- ==============================================================================
-- LabAttend Flyway Migration V1: Initial Database Schema
-- Target Database: PostgreSQL 14+ (Supabase)
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE (System Authentication for ADMIN and LECTURER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'LECTURER'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ==============================================================================
-- 2. DEGREE PROGRAMMES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS degree_programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_degree_programmes_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_degree_programmes_code ON degree_programmes (code);

-- ==============================================================================
-- 3. BATCHES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    degree_programme_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_batches_batch_code UNIQUE (batch_code),
    CONSTRAINT fk_batches_degree_programme FOREIGN KEY (degree_programme_id)
        REFERENCES degree_programmes (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_batches_degree_programme ON batches (degree_programme_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_code ON batches (batch_code);

-- ==============================================================================
-- 4. STUDENTS TABLE (Roster Records Only - No Authentication)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    degree_programme_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    qr_token_hash VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_students_student_id UNIQUE (student_id),
    CONSTRAINT uq_students_email UNIQUE (email),
    CONSTRAINT uq_students_qr_token_hash UNIQUE (qr_token_hash),
    CONSTRAINT fk_students_degree_programme FOREIGN KEY (degree_programme_id)
        REFERENCES degree_programmes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_students_batch FOREIGN KEY (batch_id)
        REFERENCES batches (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON students (student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
CREATE INDEX IF NOT EXISTS idx_students_qr_token_hash ON students (qr_token_hash);
CREATE INDEX IF NOT EXISTS idx_students_degree_programme ON students (degree_programme_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students (batch_id);

-- ==============================================================================
-- 5. LECTURERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    staff_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lecturers_user_id UNIQUE (user_id),
    CONSTRAINT uq_lecturers_staff_id UNIQUE (staff_id),
    CONSTRAINT fk_lecturers_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lecturers_user_id ON lecturers (user_id);
CREATE INDEX IF NOT EXISTS idx_lecturers_staff_id ON lecturers (staff_id);

-- ==============================================================================
-- 6. MODULES TABLE (Courses / Subjects)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_modules_module_code UNIQUE (module_code)
);

CREATE INDEX IF NOT EXISTS idx_modules_module_code ON modules (module_code);

-- ==============================================================================
-- 7. LECTURER MODULE ASSIGNMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lecturer_module_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID NOT NULL,
    module_id UUID NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lecturer_module_sem UNIQUE (lecturer_id, module_id, academic_year, semester),
    CONSTRAINT fk_lma_lecturer FOREIGN KEY (lecturer_id)
        REFERENCES lecturers (id) ON DELETE CASCADE,
    CONSTRAINT fk_lma_module FOREIGN KEY (module_id)
        REFERENCES modules (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lma_lecturer ON lecturer_module_assignments (lecturer_id);
CREATE INDEX IF NOT EXISTS idx_lma_module ON lecturer_module_assignments (module_id);

-- ==============================================================================
-- 8. LABORATORY HALLS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS laboratory_halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_laboratory_halls_hall_code UNIQUE (hall_code)
);

CREATE INDEX IF NOT EXISTS idx_laboratory_halls_hall_code ON laboratory_halls (hall_code);

-- ==============================================================================
-- 9. LAB SESSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lab_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(50) NOT NULL,
    module_id UUID NOT NULL,
    lecturer_id UUID NOT NULL,
    hall_id UUID NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    finalization_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lab_sessions_session_code UNIQUE (session_code),
    CONSTRAINT chk_lab_sessions_status CHECK (status IN ('SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED')),
    CONSTRAINT fk_lab_sessions_module FOREIGN KEY (module_id)
        REFERENCES modules (id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_sessions_lecturer FOREIGN KEY (lecturer_id)
        REFERENCES lecturers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_lab_sessions_hall FOREIGN KEY (hall_id)
        REFERENCES laboratory_halls (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_lab_sessions_module ON lab_sessions (module_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_lecturer ON lab_sessions (lecturer_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_hall ON lab_sessions (hall_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_status ON lab_sessions (status);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_date ON lab_sessions (session_date);

-- ==============================================================================
-- 10. SESSION STUDENTS TABLE (Enrolled Roster for a Session)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS session_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_session_students UNIQUE (session_id, student_id),
    CONSTRAINT fk_session_students_session FOREIGN KEY (session_id)
        REFERENCES lab_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_session_students_student FOREIGN KEY (student_id)
        REFERENCES students (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_students_session ON session_students (session_id);
CREATE INDEX IF NOT EXISTS idx_session_students_student ON session_students (student_id);

-- ==============================================================================
-- 11. ATTENDANCE RECORDS TABLE (Historical & Finalized Attendance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    method VARCHAR(20) NOT NULL,
    marked_at TIMESTAMPTZ NOT NULL,
    marked_by UUID,
    justification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_records UNIQUE (session_id, student_id),
    CONSTRAINT chk_attendance_records_status CHECK (status IN ('PRESENT', 'LATE', 'ABSENT')),
    CONSTRAINT chk_attendance_records_method CHECK (method IN ('QR_SCAN', 'MANUAL')),
    CONSTRAINT fk_attendance_records_session FOREIGN KEY (session_id)
        REFERENCES lab_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_records_student FOREIGN KEY (student_id)
        REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_records_marked_by FOREIGN KEY (marked_by)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records (session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records (status);

-- ==============================================================================
-- 12. AUDIT LOGS TABLE (Immutable Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by UUID,
    details TEXT,
    ip_address VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (performed_by)
        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
