-- Convert existing status values to uppercase for enum mapping compatibility
UPDATE appointments SET status = UPPER(status);

-- Alter table to add new columns (Prompt 2)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time TIME WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date_time TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason_for_visit VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE;

-- ────────────────────────────────────────────────────────────
-- Prompt 3: Slot Management System
-- ────────────────────────────────────────────────────────────

-- Add slot_id FK column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_id BIGINT;

-- AvailabilitySlot table
CREATE TABLE IF NOT EXISTS availability_slot (
    id             BIGSERIAL PRIMARY KEY,
    provider_type  VARCHAR(20) NOT NULL,
    provider_id    BIGINT NOT NULL,
    slot_date      DATE NOT NULL,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    is_available   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITHOUT TIME ZONE,
    updated_at     TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (provider_type, provider_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_slot_provider
    ON availability_slot (provider_type, provider_id, slot_date, is_available);

-- ProviderLeave table
CREATE TABLE IF NOT EXISTS provider_leave (
    id            BIGSERIAL PRIMARY KEY,
    provider_id   BIGINT NOT NULL,
    provider_type VARCHAR(20) NOT NULL,
    leave_date    DATE NOT NULL,
    reason        VARCHAR(500),
    created_at    TIMESTAMP WITHOUT TIME ZONE
);

-- ────────────────────────────────────────────────────────────
-- Prompt 4: Real-Time Notifications
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification (
    id            BIGSERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    title         VARCHAR(255) NOT NULL,
    message       VARCHAR(1000) NOT NULL,
    type          VARCHAR(50) NOT NULL,
    appointment_id BIGINT,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notification(user_id, is_read);
