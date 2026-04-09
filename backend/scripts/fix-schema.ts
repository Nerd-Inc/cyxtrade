import { query } from '../src/services/db'

async function fixSchema() {
  console.log('Fixing schema...')

  try {
    // Add tier column to traders if not exists
    await query(`
      ALTER TABLE traders
      ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'observer'
    `)
    console.log('Added tier column to traders')

    // Create admin_roles table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('Created admin_roles table')

    // Insert default roles
    await query(`
      INSERT INTO admin_roles (id, name, description, permissions) VALUES
        ('owner', 'Owner', 'Full access to all features', '{"traders": ["read", "approve", "reject", "suspend", "activate", "tier", "restrict", "bulk"], "disputes": ["read", "resolve"], "reports": ["read", "export"], "audit": ["read"], "roles": ["read", "assign"]}'::jsonb),
        ('manager', 'Manager', 'Can manage traders and disputes, view reports', '{"traders": ["read", "approve", "reject", "suspend", "activate", "tier", "restrict", "bulk"], "disputes": ["read", "resolve"], "reports": ["read", "export"], "audit": ["read"], "roles": []}'::jsonb),
        ('operator', 'Operator', 'Can view traders and handle basic approval actions', '{"traders": ["read", "approve", "reject"], "disputes": ["read"], "reports": ["read"], "audit": [], "roles": []}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('Inserted default roles')

    // Add admin_role to users if not exists
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20) REFERENCES admin_roles(id)
    `)
    console.log('Added admin_role column to users')

    // Update existing admins to owner role
    await query(`UPDATE users SET admin_role = 'owner' WHERE is_admin = true AND admin_role IS NULL`)
    console.log('Updated existing admins to owner role')

    // Create audit log table
    await query(`
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
      )
    `)
    console.log('Created admin_audit_log table')

    // Create tier history table
    await query(`
      CREATE TABLE IF NOT EXISTS trader_tier_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        old_tier VARCHAR(20),
        new_tier VARCHAR(20) NOT NULL,
        reason TEXT,
        changed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('Created trader_tier_history table')

    // Create restrictions table
    await query(`
      CREATE TABLE IF NOT EXISTS trader_restrictions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        restriction_type VARCHAR(30) NOT NULL,
        value JSONB,
        reason TEXT,
        applied_by UUID REFERENCES users(id),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        removed_at TIMESTAMP,
        removed_by UUID REFERENCES users(id)
      )
    `)
    console.log('Created trader_restrictions table')

    console.log('Schema fix complete!')
    process.exit(0)
  } catch (error) {
    console.error('Error fixing schema:', error)
    process.exit(1)
  }
}

fixSchema()
