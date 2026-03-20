-- Migration 005: Username and TOTP support
-- Adds username field and Google Authenticator (TOTP) for secure transactions

-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- Username validation constraint (3-30 chars, alphanumeric + underscore, starts with letter)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'username_format'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT username_format CHECK (
            username IS NULL OR (
                LENGTH(username) >= 3 AND
                LENGTH(username) <= 30 AND
                username ~ '^[a-zA-Z][a-zA-Z0-9_]*$'
            )
        );
    END IF;
END $$;

-- Index for username lookups (case-insensitive unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
ON users (LOWER(username)) WHERE username IS NOT NULL;

-- TOTP columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMP;

-- Backup codes table (hashed, single-use)
CREATE TABLE IF NOT EXISTS user_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding unused backup codes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_unused
ON user_backup_codes(user_id) WHERE used_at IS NULL;

-- TOTP verification log for sensitive operations
CREATE TABLE IF NOT EXISTS totp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL,
    verified_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Index for checking recent verifications
CREATE INDEX IF NOT EXISTS idx_totp_verifications_lookup
ON totp_verifications(user_id, operation, expires_at);

-- Cleanup old expired verifications (can be run periodically)
-- DELETE FROM totp_verifications WHERE expires_at < NOW();
