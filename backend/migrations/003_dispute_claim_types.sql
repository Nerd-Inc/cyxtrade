-- Migration: Add structured dispute claim types
-- Following PayPal pattern for standardized dispute taxonomy

-- 1. Add claim_type column to disputes table
ALTER TABLE disputes
ADD COLUMN IF NOT EXISTS claim_type VARCHAR(30) DEFAULT 'other'
  CHECK (claim_type IN (
    'item_not_received',
    'not_as_described',
    'payment_not_received',
    'wrong_amount',
    'unauthorized_transaction',
    'other'
  ));

-- 2. Add evidence categorization to dispute_evidence table
ALTER TABLE dispute_evidence
ADD COLUMN IF NOT EXISTS evidence_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- 3. Create claim types lookup table with evidence requirements
CREATE TABLE IF NOT EXISTS dispute_claim_types (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    required_evidence JSONB NOT NULL,
    optional_evidence JSONB,
    available_for_buyer BOOLEAN DEFAULT true,
    available_for_seller BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insert claim types with evidence requirements
INSERT INTO dispute_claim_types (id, name, description, required_evidence, optional_evidence, available_for_buyer, available_for_seller, display_order) VALUES
(
    'item_not_received',
    'Item/Funds Not Received',
    'Payment sent but goods, crypto, or fiat never received',
    '[
        {"category": "payment_screenshot", "label": "Payment Screenshot", "description": "Screenshot showing your payment was sent", "evidenceType": "screenshot"},
        {"category": "transaction_reference", "label": "Transaction Reference", "description": "Bank or payment provider reference number", "evidenceType": "document"},
        {"category": "payment_timestamp", "label": "Payment Timestamp", "description": "Proof showing when payment was made", "evidenceType": "screenshot"}
    ]'::jsonb,
    '[
        {"category": "chat_logs", "label": "Chat Logs", "description": "Relevant conversation with counterparty", "evidenceType": "screenshot"},
        {"category": "bank_statement", "label": "Bank Statement", "description": "Statement showing the debit from your account", "evidenceType": "document"}
    ]'::jsonb,
    true,
    false,
    1
),
(
    'not_as_described',
    'Not as Described',
    'Received item or amount differs from what was promised',
    '[
        {"category": "original_agreement", "label": "Original Agreement", "description": "Screenshot of original ad or agreed terms", "evidenceType": "screenshot"},
        {"category": "received_proof", "label": "Proof of What Received", "description": "Screenshot showing what you actually received", "evidenceType": "screenshot"}
    ]'::jsonb,
    '[
        {"category": "chat_logs", "label": "Chat Logs", "description": "Conversation showing the discrepancy", "evidenceType": "screenshot"},
        {"category": "rate_evidence", "label": "Exchange Rate Evidence", "description": "If dispute is about rate differences", "evidenceType": "document"}
    ]'::jsonb,
    true,
    false,
    2
),
(
    'payment_not_received',
    'Payment Not Received',
    'Buyer claims to have paid but seller never received payment',
    '[
        {"category": "account_statement", "label": "Account Statement", "description": "Bank statement showing no incoming transaction", "evidenceType": "document"},
        {"category": "account_history", "label": "Account History Screenshot", "description": "Screenshot of account during disputed period", "evidenceType": "screenshot"}
    ]'::jsonb,
    '[
        {"category": "chat_logs", "label": "Chat Logs", "description": "Conversation where buyer claimed payment", "evidenceType": "screenshot"},
        {"category": "expected_payment_details", "label": "Expected Payment Details", "description": "Reference number provided by buyer", "evidenceType": "document"}
    ]'::jsonb,
    false,
    true,
    3
),
(
    'wrong_amount',
    'Wrong Amount',
    'Received a different amount than what was agreed',
    '[
        {"category": "agreed_amount_proof", "label": "Agreed Amount Proof", "description": "Order details or chat showing agreed amount", "evidenceType": "screenshot"},
        {"category": "received_amount_proof", "label": "Received Amount Proof", "description": "Screenshot showing actual amount received", "evidenceType": "screenshot"}
    ]'::jsonb,
    '[
        {"category": "fee_breakdown", "label": "Fee Breakdown", "description": "If dispute involves unexpected fees", "evidenceType": "document"}
    ]'::jsonb,
    true,
    true,
    4
),
(
    'unauthorized_transaction',
    'Unauthorized Transaction',
    'Transaction was made without your consent or by a third party',
    '[
        {"category": "unauthorized_proof", "label": "Proof of Unauthorized Access", "description": "Evidence that transaction was not initiated by you", "evidenceType": "document"},
        {"category": "account_holder_statement", "label": "Account Holder Statement", "description": "Written statement from actual account holder", "evidenceType": "document"}
    ]'::jsonb,
    '[
        {"category": "device_info", "label": "Device Information", "description": "Information about devices that accessed account", "evidenceType": "document"}
    ]'::jsonb,
    true,
    true,
    5
),
(
    'other',
    'Other Issue',
    'Problem not covered by the categories above',
    '[
        {"category": "detailed_description", "label": "Detailed Description", "description": "Provide a detailed description of the issue (minimum 100 characters)", "evidenceType": "message"}
    ]'::jsonb,
    '[
        {"category": "supporting_documents", "label": "Supporting Documents", "description": "Any relevant documentation", "evidenceType": "document"}
    ]'::jsonb,
    true,
    true,
    6
)
ON CONFLICT (id) DO NOTHING;

-- 5. Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_disputes_claim_type ON disputes(claim_type);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_category ON dispute_evidence(evidence_category);
