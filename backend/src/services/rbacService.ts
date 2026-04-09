import { query, queryOne } from './db'
import { AppError, ErrorCode } from '../utils/errors'

// ============================================================================
// Types
// ============================================================================

export type Resource = 'traders' | 'disputes' | 'reports' | 'audit' | 'roles'

export type Permission =
  | 'read'
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'activate'
  | 'tier'
  | 'restrict'
  | 'bulk'
  | 'resolve'
  | 'export'
  | 'assign'

export type RoleId = 'owner' | 'manager' | 'operator'

export interface AdminRole {
  id: RoleId
  name: string
  description: string
  permissions: Record<Resource, Permission[]>
  createdAt: string
}

export interface UserWithRole {
  id: string
  displayName: string | null
  email: string | null
  phone: string
  isAdmin: boolean
  adminRole: RoleId | null
  roleName: string | null
}

// ============================================================================
// Role Definitions (cached for performance)
// ============================================================================

const ROLE_PERMISSIONS: Record<RoleId, Record<Resource, Permission[]>> = {
  owner: {
    traders: ['read', 'approve', 'reject', 'suspend', 'activate', 'tier', 'restrict', 'bulk'],
    disputes: ['read', 'resolve'],
    reports: ['read', 'export'],
    audit: ['read'],
    roles: ['read', 'assign']
  },
  manager: {
    traders: ['read', 'approve', 'reject', 'suspend', 'activate', 'tier', 'restrict', 'bulk'],
    disputes: ['read', 'resolve'],
    reports: ['read', 'export'],
    audit: ['read'],
    roles: []
  },
  operator: {
    traders: ['read', 'approve', 'reject'],
    disputes: ['read'],
    reports: ['read'],
    audit: [],
    roles: []
  }
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if a role has a specific permission on a resource
 */
export function hasPermission(
  role: RoleId | null | undefined,
  resource: Resource,
  action: Permission
): boolean {
  if (!role) return false

  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false

  const resourcePerms = rolePerms[resource]
  if (!resourcePerms) return false

  return resourcePerms.includes(action)
}

/**
 * Check if a user has a specific permission
 */
export async function userHasPermission(
  userId: string,
  resource: Resource,
  action: Permission
): Promise<boolean> {
  const user = await queryOne<{
    is_admin: boolean
    admin_role: RoleId | null
  }>(
    `SELECT is_admin, admin_role FROM users WHERE id = $1`,
    [userId]
  )

  if (!user || !user.is_admin) return false

  return hasPermission(user.admin_role, resource, action)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: RoleId): Record<Resource, Permission[]> {
  return ROLE_PERMISSIONS[role] || {
    traders: [],
    disputes: [],
    reports: [],
    audit: [],
    roles: []
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string
): Promise<Record<Resource, Permission[]> | null> {
  const user = await queryOne<{
    is_admin: boolean
    admin_role: RoleId | null
  }>(
    `SELECT is_admin, admin_role FROM users WHERE id = $1`,
    [userId]
  )

  if (!user || !user.is_admin || !user.admin_role) return null

  return getRolePermissions(user.admin_role)
}

// ============================================================================
// Role Management
// ============================================================================

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<AdminRole[]> {
  const roles = await query<{
    id: string
    name: string
    description: string | null
    permissions: Record<Resource, Permission[]>
    created_at: string
  }>(
    `SELECT id, name, description, permissions, created_at
     FROM admin_roles
     ORDER BY
       CASE id
         WHEN 'owner' THEN 1
         WHEN 'manager' THEN 2
         WHEN 'operator' THEN 3
         ELSE 4
       END`
  )

  return roles.map(row => ({
    id: row.id as RoleId,
    name: row.name,
    description: row.description || '',
    permissions: row.permissions,
    createdAt: row.created_at
  }))
}

/**
 * Get a specific role by ID
 */
export async function getRole(roleId: RoleId): Promise<AdminRole | null> {
  const row = await queryOne<{
    id: string
    name: string
    description: string | null
    permissions: Record<Resource, Permission[]>
    created_at: string
  }>(
    `SELECT id, name, description, permissions, created_at
     FROM admin_roles
     WHERE id = $1`,
    [roleId]
  )

  if (!row) return null

  return {
    id: row.id as RoleId,
    name: row.name,
    description: row.description || '',
    permissions: row.permissions,
    createdAt: row.created_at
  }
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  userId: string,
  roleId: RoleId,
  assignedBy: string
): Promise<void> {
  // Verify assigner has permission
  const canAssign = await userHasPermission(assignedBy, 'roles', 'assign')
  if (!canAssign) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      'You do not have permission to assign roles'
    )
  }

  // Verify role exists
  const role = await getRole(roleId)
  if (!role) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Role not found')
  }

  // Update user
  const result = await queryOne<{ id: string }>(
    `UPDATE users
     SET admin_role = $1, is_admin = true, updated_at = NOW()
     WHERE id = $2
     RETURNING id`,
    [roleId, userId]
  )

  if (!result) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found')
  }
}

/**
 * Remove admin role from a user
 */
export async function removeRole(
  userId: string,
  removedBy: string
): Promise<void> {
  // Verify remover has permission
  const canAssign = await userHasPermission(removedBy, 'roles', 'assign')
  if (!canAssign) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      'You do not have permission to modify roles'
    )
  }

  // Prevent removing own role
  if (userId === removedBy) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'You cannot remove your own admin role'
    )
  }

  await queryOne(
    `UPDATE users
     SET admin_role = NULL, is_admin = false, updated_at = NOW()
     WHERE id = $1`,
    [userId]
  )
}

/**
 * Get all admin users with their roles
 */
export async function getAdminUsers(): Promise<UserWithRole[]> {
  const users = await query<{
    id: string
    display_name: string | null
    email: string | null
    phone: string
    is_admin: boolean
    admin_role: RoleId | null
    role_name: string | null
  }>(
    `SELECT
       u.id,
       u.display_name,
       u.email,
       u.phone,
       u.is_admin,
       u.admin_role,
       ar.name as role_name
     FROM users u
     LEFT JOIN admin_roles ar ON u.admin_role = ar.id
     WHERE u.is_admin = true
     ORDER BY
       CASE u.admin_role
         WHEN 'owner' THEN 1
         WHEN 'manager' THEN 2
         WHEN 'operator' THEN 3
         ELSE 4
       END,
       u.created_at`
  )

  return users.map(row => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    isAdmin: row.is_admin,
    adminRole: row.admin_role,
    roleName: row.role_name
  }))
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a role ID is valid
 */
export function isValidRole(roleId: string): roleId is RoleId {
  return ['owner', 'manager', 'operator'].includes(roleId)
}

/**
 * Validate that a resource is valid
 */
export function isValidResource(resource: string): resource is Resource {
  return ['traders', 'disputes', 'reports', 'audit', 'roles'].includes(resource)
}

/**
 * Validate that a permission is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return [
    'read', 'approve', 'reject', 'suspend', 'activate',
    'tier', 'restrict', 'bulk', 'resolve', 'export', 'assign'
  ].includes(permission)
}

// ============================================================================
// Permission Descriptions (for UI)
// ============================================================================

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  read: 'View records',
  approve: 'Approve applications',
  reject: 'Reject applications',
  suspend: 'Suspend active accounts',
  activate: 'Reactivate suspended accounts',
  tier: 'Change trader tiers',
  restrict: 'Add/remove restrictions',
  bulk: 'Perform bulk operations',
  resolve: 'Resolve disputes',
  export: 'Export data',
  assign: 'Assign roles to users'
}

export const RESOURCE_DESCRIPTIONS: Record<Resource, string> = {
  traders: 'Trader Management',
  disputes: 'Dispute Resolution',
  reports: 'Reports & Analytics',
  audit: 'Audit Logs',
  roles: 'Role Management'
}
