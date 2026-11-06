-- V21__system_settings.sql
-- Creates system_settings table to support admin-configured thresholds and parameters

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('low_attendance_threshold', '80.0', 'Threshold percentage below which attendance is considered low or at risk (default: 80.0)')
ON CONFLICT (setting_key) DO NOTHING;
