-- Migration: Admin RBAC and Audit Logging
-- Description: Add role-based access control, audit logging, tier history, and trader restrictions

-- ============================================================================
-- 1. ADMIN ROLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_roles (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (id, name, description, permissions) VALUES
    ('owner', 'Owner', 'Full access to all features', '{
        "traders": ["read", "approve", "reject", "suspend", "activate", "tier", "restrict", "bulk"],
        "disputes": ["read", "resolve"],
        "reports": ["read", "export"],
        "audit": ["read"],
        "roles": ["read", "assign"]
    }'::jsonb),
    ('manager', 'Manager', 'Can manage traders and disputes, view reports', '{
        "traders": ["read", "approve", "reject", "suspend", "activate", "tier", "restrict", "bulk"],
        "disputes": ["read", "resolve"],
        "reports": ["read", "export"],
        "audit": ["read"],
        "roles": []
    }'::jsonb),
    ('operator', 'Operator', 'Can view traders and handle basic approval actions', '{
        "traders": ["read", "approve", "reject"],
        "disputes": ["read"],
        "reports": ["read"],
        "audit": [],
        "roles": []
    }'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ADD ROLE TO USERS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20) REFERENCES admin_roles(id);

-- Update existing admins to owner role
UPDATE users SET admin_role = 'owner' WHERE is_admin = true AND admin_role IS NULL;

-- ============================================================================
-- 3. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at DESC);

-- ============================================================================
-- 4. TRADER TIER HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS trader_tier_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    old_tier VARCHAR(20),
    new_tier VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_trader ON trader_tier_history(trader_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_created ON trader_tier_history(created_at DESC);

-- ============================================================================
-- 5. TRADER RESTRICTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS trader_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    restriction_type VARCHAR(30) NOT NULL CHECK (restriction_type IN (
        'volume_limit',      -- Daily/monthly volume cap
        'corridor_limit',    -- Restricted to specific corridors
        'no_new_trades',     -- Cannot accept new trades
        'under_review',      -- Account under investigation
        'kyc_required',      -- Must complete KYC
        'bond_hold'          -- Bond withdrawal blocked
    )),
    value JSONB,             -- Additional restriction data (e.g., volume limit amount)
    reason TEXT,
    applied_by UUID REFERENCES users(id),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    removed_at TIMESTAMP,
    removed_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_restrictions_trader ON trader_restrictions(trader_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_active ON trader_restrictions(trader_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_restrictions_type ON trader_restrictions(restriction_type);

-- ============================================================================
-- 6. HELPER FUNCTION: CHECK PERMISSION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_admin_permission(
    p_user_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_resource_perms JSONB;
BEGIN
    -- Get user's role permissions
    SELECT ar.permissions INTO v_permissions
    FROM users u
    JOIN admin_roles ar ON u.admin_role = ar.id
    WHERE u.id = p_user_id AND u.is_admin = true;

    IF v_permissions IS NULL THEN
        RETURN false;
    END IF;

    -- Check for wildcard permission
    IF v_permissions ? '*' THEN
        RETURN true;
    END IF;

    -- Get resource permissions
    v_resource_perms := v_permissions -> p_resource;

    IF v_resource_perms IS NULL THEN
        RETURN false;
    END IF;

    -- Check if action is in permissions array
    RETURN v_resource_perms ? p_action;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ADD AUDIT TRIGGER FOR TRADER STATUS CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trader_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (
            COALESCE(NEW.approved_by, current_setting('app.current_user_id', true)::uuid),
            'status_change',
            'trader',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger commented out - audit logging will be done in application layer for better control
-- CREATE TRIGGER trader_status_audit
-- AFTER UPDATE ON traders
-- FOR EACH ROW
-- EXECUTE FUNCTION audit_trader_status_change();
