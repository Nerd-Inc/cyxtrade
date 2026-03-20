import { query, queryOne } from './db'
import { AppError, ErrorCode } from '../utils/errors'
import type {
  DisputeClaimType,
  DisputeClaimTypeInfo,
  EvidenceRequirement,
  CreateEvidenceDTO
} from '../types'

// Valid claim types for validation
export const VALID_CLAIM_TYPES: DisputeClaimType[] = [
  'item_not_received',
  'not_as_described',
  'payment_not_received',
  'wrong_amount',
  'unauthorized_transaction',
  'other'
]

/**
 * Get available claim types, optionally filtered by user role
 */
export async function getAvailableClaimTypes(
  userRole?: 'buyer' | 'seller' | null
): Promise<DisputeClaimTypeInfo[]> {
  let whereClause = 'WHERE is_active = true'

  if (userRole === 'buyer') {
    whereClause += ' AND available_for_buyer = true'
  } else if (userRole === 'seller') {
    whereClause += ' AND available_for_seller = true'
  }

  const rows = await query<{
    id: string
    name: string
    description: string
    required_evidence: EvidenceRequirement[]
    optional_evidence: EvidenceRequirement[] | null
    available_for_buyer: boolean
    available_for_seller: boolean
    is_active: boolean
    display_order: number
  }>(
    `SELECT id, name, description, required_evidence, optional_evidence,
            available_for_buyer, available_for_seller, is_active, display_order
     FROM dispute_claim_types
     ${whereClause}
     ORDER BY display_order ASC`
  )

  return rows.map(row => ({
    id: row.id as DisputeClaimType,
    name: row.name,
    description: row.description,
    required_evidence: row.required_evidence || [],
    optional_evidence: row.optional_evidence || [],
    available_for_buyer: row.available_for_buyer,
    available_for_seller: row.available_for_seller,
    is_active: row.is_active,
    display_order: row.display_order
  }))
}

/**
 * Get a specific claim type's info
 */
export async function getClaimTypeInfo(
  claimType: DisputeClaimType
): Promise<DisputeClaimTypeInfo | null> {
  const row = await queryOne<{
    id: string
    name: string
    description: string
    required_evidence: EvidenceRequirement[]
    optional_evidence: EvidenceRequirement[] | null
    available_for_buyer: boolean
    available_for_seller: boolean
    is_active: boolean
    display_order: number
  }>(
    `SELECT id, name, description, required_evidence, optional_evidence,
            available_for_buyer, available_for_seller, is_active, display_order
     FROM dispute_claim_types
     WHERE id = $1 AND is_active = true`,
    [claimType]
  )

  if (!row) return null

  return {
    id: row.id as DisputeClaimType,
    name: row.name,
    description: row.description,
    required_evidence: row.required_evidence || [],
    optional_evidence: row.optional_evidence || [],
    available_for_buyer: row.available_for_buyer,
    available_for_seller: row.available_for_seller,
    is_active: row.is_active,
    display_order: row.display_order
  }
}

/**
 * Get evidence checklist for a specific claim type
 */
export async function getEvidenceChecklist(
  claimType: DisputeClaimType
): Promise<{
  required: EvidenceRequirement[]
  optional: EvidenceRequirement[]
}> {
  const claimTypeInfo = await getClaimTypeInfo(claimType)

  if (!claimTypeInfo) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Claim type not found')
  }

  return {
    required: claimTypeInfo.required_evidence,
    optional: claimTypeInfo.optional_evidence
  }
}

/**
 * Validate that submitted evidence meets requirements for claim type
 */
export async function validateEvidenceSubmission(
  claimType: DisputeClaimType,
  submittedEvidence: CreateEvidenceDTO[]
): Promise<{ valid: boolean; missing: string[] }> {
  const checklist = await getEvidenceChecklist(claimType)

  const submittedCategories = submittedEvidence
    .filter(e => e.evidence_category)
    .map(e => e.evidence_category!)

  const requiredCategories = checklist.required.map(e => e.category)

  const missing = requiredCategories.filter(cat => !submittedCategories.includes(cat))

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate claim type is valid and appropriate for user role
 */
export async function validateClaimTypeForRole(
  claimType: DisputeClaimType,
  isBuyer: boolean
): Promise<void> {
  if (!VALID_CLAIM_TYPES.includes(claimType)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid claim type', {
      field: 'claimType',
      validTypes: VALID_CLAIM_TYPES
    })
  }

  const claimTypeInfo = await getClaimTypeInfo(claimType)

  if (!claimTypeInfo) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Claim type not found')
  }

  if (isBuyer && !claimTypeInfo.available_for_buyer) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'This claim type is not available for buyers'
    )
  }

  if (!isBuyer && !claimTypeInfo.available_for_seller) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'This claim type is not available for sellers'
    )
  }
}

/**
 * Get claim type display name
 */
export function getClaimTypeDisplayName(claimType: DisputeClaimType): string {
  const displayNames: Record<DisputeClaimType, string> = {
    item_not_received: 'Item/Funds Not Received',
    not_as_described: 'Not as Described',
    payment_not_received: 'Payment Not Received',
    wrong_amount: 'Wrong Amount',
    unauthorized_transaction: 'Unauthorized Transaction',
    other: 'Other Issue'
  }
  return displayNames[claimType] || claimType
}
