import crypto from 'crypto';
import { query, queryOne } from './db';
import { AppError, ErrorCode } from '../utils/errors';

export interface VerificationResult {
  code: string;
  amount: number;
  instructions: string;
  expiresAt: Date;
}

export interface PaymentMethod {
  id: string;
  trader_id: string;
  method_type: string;
  provider: string | null;
  account_holder_name: string;
  phone_number: string | null;
  account_number: string | null;
  verification_status: string;
  verification_code: string | null;
  verification_attempts: number;
  verification_expires_at: Date | null;
  verification_proof_url: string | null;
}

// Check if a payment method identifier is blacklisted
export async function isBlacklisted(methodType: string, identifier: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM payment_method_blacklist
     WHERE method_type = $1 AND identifier = $2`,
    [methodType, identifier]
  );
  return result !== null;
}

// Add a payment method to blacklist
export async function addToBlacklist(
  methodType: string,
  identifier: string,
  reason: string,
  reportedBy: string,
  tradeId?: string,
  evidenceUrl?: string
): Promise<void> {
  await query(
    `INSERT INTO payment_method_blacklist (method_type, identifier, reason, reported_by, trade_id, evidence_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (method_type, identifier) DO NOTHING`,
    [methodType, identifier, reason, reportedBy, tradeId || null, evidenceUrl || null]
  );
}

// Get payment method by ID and verify ownership
async function getPaymentMethodForTrader(methodId: string, traderId: string): Promise<PaymentMethod> {
  const method = await queryOne<PaymentMethod>(
    `SELECT * FROM trader_payment_methods
     WHERE id = $1 AND trader_id = $2 AND is_active = TRUE`,
    [methodId, traderId]
  );

  if (!method) {
    throw new AppError(ErrorCode.PAYMENT_METHOD_NOT_FOUND, 'Payment method not found');
  }

  return method;
}

// Generate verification instructions based on method type
function getVerificationInstructions(method: PaymentMethod, code: string, amount: number): string {
  const identifier = method.phone_number || method.account_number || 'your account';

  if (method.method_type === 'mobile_money') {
    return `To verify ownership of ${method.provider || 'Mobile Money'} account (${identifier}):

1. Send exactly ${amount} XAF from this account to any other account you control
2. Include "${code}" in the payment reference/description
3. Take a screenshot of the transaction confirmation showing:
   - The sending account (${identifier})
   - The amount (${amount} XAF)
   - The reference containing "${code}"
4. Upload the screenshot to complete verification

The verification code expires in 24 hours.`;
  } else {
    // Bank transfer
    return `To verify ownership of ${method.bank_name || 'bank'} account (${identifier}):

1. Make a transfer of exactly ${amount} XAF from this account to any other account
2. Include "${code}" in the transfer reference/description
3. Take a screenshot or photo of the transaction confirmation showing:
   - The sending account details
   - The amount (${amount} XAF)
   - The reference containing "${code}"
4. Upload the proof to complete verification

The verification code expires in 24 hours.`;
  }
}

// Initiate verification for a payment method
export async function initiateVerification(
  methodId: string,
  traderId: string
): Promise<VerificationResult> {
  const method = await getPaymentMethodForTrader(methodId, traderId);

  // Check if already verified
  if (method.verification_status === 'verified') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'This payment method is already verified');
  }

  // Check blacklist
  const identifier = method.phone_number || method.account_number;
  if (identifier) {
    const blacklisted = await isBlacklisted(method.method_type, identifier);
    if (blacklisted) {
      throw new AppError(ErrorCode.FORBIDDEN, 'This payment method has been blacklisted due to suspicious activity');
    }
  }

  // Generate verification code
  const code = `CYX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const amount = method.method_type === 'mobile_money' ? 50 : 100; // XAF

  // Update payment method with verification data
  await query(
    `UPDATE trader_payment_methods
     SET verification_status = 'pending',
         verification_code = $1,
         verification_sent_at = NOW(),
         verification_expires_at = $2,
         verification_attempts = 0,
         updated_at = NOW()
     WHERE id = $3`,
    [code, expiresAt, methodId]
  );

  return {
    code,
    amount,
    instructions: getVerificationInstructions(method, code, amount),
    expiresAt
  };
}

// Submit verification proof (screenshot)
export async function submitVerificationProof(
  methodId: string,
  traderId: string,
  proofUrl: string
): Promise<{ verified: boolean }> {
  const method = await getPaymentMethodForTrader(methodId, traderId);

  // Check status
  if (method.verification_status !== 'pending') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'No pending verification for this payment method');
  }

  // Check expiry
  if (method.verification_expires_at && new Date() > new Date(method.verification_expires_at)) {
    await query(
      `UPDATE trader_payment_methods
       SET verification_status = 'expired', updated_at = NOW()
       WHERE id = $1`,
      [methodId]
    );
    throw new AppError(ErrorCode.EXPIRED_TOKEN, 'Verification code has expired. Please request a new one.');
  }

  // Store proof and mark as verified
  // In production, you might want to add a manual review step
  await query(
    `UPDATE trader_payment_methods
     SET verification_status = 'verified',
         verified_at = NOW(),
         verification_proof_url = $1,
         verification_code = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [proofUrl, methodId]
  );

  return { verified: true };
}

// Get verified payment methods for a trader
export async function getVerifiedPaymentMethods(traderId: string): Promise<PaymentMethod[]> {
  return await query<PaymentMethod>(
    `SELECT * FROM trader_payment_methods
     WHERE trader_id = $1
       AND is_active = TRUE
       AND verification_status = 'verified'
     ORDER BY is_primary DESC, created_at DESC`,
    [traderId]
  );
}

// Check if trader has at least one verified payment method
export async function hasVerifiedPaymentMethod(traderId: string): Promise<boolean> {
  const methods = await getVerifiedPaymentMethods(traderId);
  return methods.length > 0;
}

// Cancel verification (reset to unverified)
export async function cancelVerification(methodId: string, traderId: string): Promise<void> {
  await getPaymentMethodForTrader(methodId, traderId);

  await query(
    `UPDATE trader_payment_methods
     SET verification_status = 'unverified',
         verification_code = NULL,
         verification_sent_at = NULL,
         verification_expires_at = NULL,
         verification_attempts = 0,
         updated_at = NOW()
     WHERE id = $1 AND trader_id = $2`,
    [methodId, traderId]
  );
}

// Get verification status for a payment method
export async function getVerificationStatus(methodId: string, traderId: string) {
  const method = await getPaymentMethodForTrader(methodId, traderId);

  return {
    status: method.verification_status,
    verifiedAt: method.verification_status === 'verified'
      ? await queryOne<{ verified_at: Date }>('SELECT verified_at FROM trader_payment_methods WHERE id = $1', [methodId])
        .then(r => r?.verified_at)
      : null,
    expiresAt: method.verification_status === 'pending' ? method.verification_expires_at : null,
    hasProof: !!method.verification_proof_url
  };
}
