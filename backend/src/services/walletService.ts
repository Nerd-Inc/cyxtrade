import { query, queryOne, transaction } from './db';
import { AppError, ErrorCode } from '../utils/errors';

// ============================================
// Types
// ============================================

export interface UserWallet {
  id: string;
  user_id: string;
  asset: string;
  available_balance: number;
  locked_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  created_at: Date;
  updated_at: Date;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  asset: string;
  type: 'deposit' | 'withdrawal' | 'escrow_lock' | 'escrow_release' | 'escrow_transfer' | 'trade_fee';
  amount: number;
  fee: number;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  reference_type: string | null;
  reference_id: string | null;
  tx_hash: string | null;
  from_address: string | null;
  to_address: string | null;
  network: string | null;
  confirmations: number;
  required_confirmations: number;
  notes: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface DepositAddress {
  id: string;
  user_id: string;
  asset: string;
  network: string;
  address: string;
  memo: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface SupportedAsset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  contract_address: string | null;
  decimals: number;
  min_deposit: number;
  min_withdrawal: number;
  withdrawal_fee: number;
  is_active: boolean;
  is_fiat: boolean;
  icon_url: string | null;
}

// ============================================
// Wallet Balance Operations
// ============================================

export async function getWallet(userId: string, asset: string): Promise<UserWallet | null> {
  return queryOne<UserWallet>(
    `SELECT * FROM user_wallets WHERE user_id = $1 AND asset = $2`,
    [userId, asset]
  );
}

export async function getOrCreateWallet(userId: string, asset: string): Promise<UserWallet> {
  let wallet = await getWallet(userId, asset);

  if (!wallet) {
    const rows = await query<UserWallet>(
      `INSERT INTO user_wallets (user_id, asset)
       VALUES ($1, $2)
       ON CONFLICT (user_id, asset) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId, asset]
    );
    wallet = rows[0];
  }

  return wallet;
}

export async function getAllWallets(userId: string): Promise<UserWallet[]> {
  return query<UserWallet>(
    `SELECT w.*, a.name as asset_name, a.icon_url
     FROM user_wallets w
     JOIN supported_assets a ON w.asset = a.symbol
     WHERE w.user_id = $1
     ORDER BY w.available_balance + w.locked_balance DESC`,
    [userId]
  );
}

export async function getWalletBalance(userId: string, asset: string): Promise<{
  available: number;
  locked: number;
  total: number;
}> {
  const wallet = await getWallet(userId, asset);

  if (!wallet) {
    return { available: 0, locked: 0, total: 0 };
  }

  return {
    available: Number(wallet.available_balance),
    locked: Number(wallet.locked_balance),
    total: Number(wallet.available_balance) + Number(wallet.locked_balance),
  };
}

// ============================================
// Internal Balance Operations
// ============================================

async function updateBalance(
  userId: string,
  asset: string,
  availableDelta: number,
  lockedDelta: number,
  txType: WalletTransaction['type'],
  options: {
    referenceType?: string;
    referenceId?: string;
    txHash?: string;
    fromAddress?: string;
    toAddress?: string;
    network?: string;
    fee?: number;
    notes?: string;
  } = {}
): Promise<WalletTransaction> {
  return transaction(async (client) => {
    // Get current balance with lock
    const walletResult = await client.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND asset = $2 FOR UPDATE`,
      [userId, asset]
    );

    let wallet = walletResult.rows[0];

    // Create wallet if doesn't exist
    if (!wallet) {
      const createResult = await client.query(
        `INSERT INTO user_wallets (user_id, asset)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, asset]
      );
      wallet = createResult.rows[0];
    }

    const currentAvailable = Number(wallet.available_balance);
    const currentLocked = Number(wallet.locked_balance);

    const newAvailable = currentAvailable + availableDelta;
    const newLocked = currentLocked + lockedDelta;

    // Validate no negative balances
    if (newAvailable < 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Insufficient available balance');
    }
    if (newLocked < 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid locked balance operation');
    }

    // Update wallet
    await client.query(
      `UPDATE user_wallets
       SET available_balance = $3,
           locked_balance = $4,
           total_deposited = total_deposited + $5,
           total_withdrawn = total_withdrawn + $6,
           updated_at = NOW()
       WHERE user_id = $1 AND asset = $2`,
      [
        userId,
        asset,
        newAvailable,
        newLocked,
        txType === 'deposit' ? Math.abs(availableDelta) : 0,
        txType === 'withdrawal' ? Math.abs(availableDelta) : 0,
      ]
    );

    // Create transaction record
    const txResult = await client.query(
      `INSERT INTO wallet_transactions (
        user_id, asset, type, amount, fee, balance_before, balance_after,
        status, reference_type, reference_id, tx_hash, from_address, to_address, network, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        userId,
        asset,
        txType,
        Math.abs(availableDelta) + Math.abs(lockedDelta),
        options.fee || 0,
        currentAvailable,
        newAvailable,
        'completed',
        options.referenceType || null,
        options.referenceId || null,
        options.txHash || null,
        options.fromAddress || null,
        options.toAddress || null,
        options.network || null,
        options.notes || null,
      ]
    );

    return txResult.rows[0];
  });
}

// ============================================
// Public Wallet Operations
// ============================================

export async function creditDeposit(
  userId: string,
  asset: string,
  amount: number,
  options: {
    txHash?: string;
    fromAddress?: string;
    network?: string;
  } = {}
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }

  return updateBalance(userId, asset, amount, 0, 'deposit', {
    txHash: options.txHash,
    fromAddress: options.fromAddress,
    network: options.network,
    notes: `Deposit ${amount} ${asset}`,
  });
}

export async function requestWithdrawal(
  userId: string,
  asset: string,
  amount: number,
  toAddress: string,
  network: string
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }

  // Get asset info for fee
  const assetInfo = await queryOne<SupportedAsset>(
    `SELECT * FROM supported_assets WHERE symbol = $1 AND is_active = TRUE`,
    [asset]
  );

  if (!assetInfo) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Asset not supported');
  }

  if (amount < Number(assetInfo.min_withdrawal)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Minimum withdrawal is ${assetInfo.min_withdrawal} ${asset}`
    );
  }

  const fee = Number(assetInfo.withdrawal_fee);
  const totalDebit = amount + fee;

  // Check balance
  const balance = await getWalletBalance(userId, asset);
  if (balance.available < totalDebit) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Insufficient balance');
  }

  // Create pending withdrawal (actual blockchain send happens separately)
  return transaction(async (client) => {
    // Lock balance
    await client.query(
      `UPDATE user_wallets
       SET available_balance = available_balance - $3,
           locked_balance = locked_balance + $3,
           updated_at = NOW()
       WHERE user_id = $1 AND asset = $2`,
      [userId, asset, totalDebit]
    );

    // Create transaction record
    const txResult = await client.query(
      `INSERT INTO wallet_transactions (
        user_id, asset, type, amount, fee, balance_before, balance_after,
        status, to_address, network, notes
      ) VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6, 'pending', $7, $8, $9)
      RETURNING *`,
      [
        userId,
        asset,
        amount,
        fee,
        balance.available,
        balance.available - totalDebit,
        toAddress,
        network,
        `Withdrawal ${amount} ${asset} to ${toAddress}`,
      ]
    );

    return txResult.rows[0];
  });
}

export async function completeWithdrawal(
  txId: string,
  txHash: string
): Promise<WalletTransaction> {
  return transaction(async (client) => {
    // Get transaction
    const txResult = await client.query(
      `SELECT * FROM wallet_transactions WHERE id = $1 AND type = 'withdrawal' AND status = 'pending' FOR UPDATE`,
      [txId]
    );

    const tx = txResult.rows[0];
    if (!tx) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Transaction not found');
    }

    const totalDebit = Number(tx.amount) + Number(tx.fee);

    // Deduct from locked balance
    await client.query(
      `UPDATE user_wallets
       SET locked_balance = locked_balance - $3,
           total_withdrawn = total_withdrawn + $4,
           updated_at = NOW()
       WHERE user_id = $1 AND asset = $2`,
      [tx.user_id, tx.asset, totalDebit, tx.amount]
    );

    // Update transaction
    const updateResult = await client.query(
      `UPDATE wallet_transactions
       SET status = 'completed', tx_hash = $2, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [txId, txHash]
    );

    return updateResult.rows[0];
  });
}

export async function cancelWithdrawal(txId: string, reason?: string): Promise<void> {
  await transaction(async (client) => {
    // Get transaction
    const txResult = await client.query(
      `SELECT * FROM wallet_transactions WHERE id = $1 AND type = 'withdrawal' AND status = 'pending' FOR UPDATE`,
      [txId]
    );

    const tx = txResult.rows[0];
    if (!tx) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Transaction not found');
    }

    const totalDebit = Number(tx.amount) + Number(tx.fee);

    // Return to available balance
    await client.query(
      `UPDATE user_wallets
       SET available_balance = available_balance + $3,
           locked_balance = locked_balance - $3,
           updated_at = NOW()
       WHERE user_id = $1 AND asset = $2`,
      [tx.user_id, tx.asset, totalDebit]
    );

    // Update transaction
    await client.query(
      `UPDATE wallet_transactions
       SET status = 'cancelled', notes = COALESCE(notes, '') || ' | Cancelled: ' || $2
       WHERE id = $1`,
      [txId, reason || 'User cancelled']
    );
  });
}

// ============================================
// Escrow Operations (for P2P trades)
// ============================================

export async function lockEscrow(
  userId: string,
  asset: string,
  amount: number,
  orderId: string
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }

  const balance = await getWalletBalance(userId, asset);
  if (balance.available < amount) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Insufficient balance for escrow');
  }

  return updateBalance(userId, asset, -amount, amount, 'escrow_lock', {
    referenceType: 'p2p_order',
    referenceId: orderId,
    notes: `Escrow lock for order ${orderId}`,
  });
}

export async function releaseEscrow(
  fromUserId: string,
  toUserId: string,
  asset: string,
  amount: number,
  orderId: string,
  fee: number = 0
): Promise<{ fromTx: WalletTransaction; toTx: WalletTransaction }> {
  return transaction(async (client) => {
    // Verify sender has locked balance
    const senderWallet = await client.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND asset = $2 FOR UPDATE`,
      [fromUserId, asset]
    );

    if (!senderWallet.rows[0] || Number(senderWallet.rows[0].locked_balance) < amount) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Insufficient locked balance');
    }

    const senderBefore = Number(senderWallet.rows[0].available_balance);
    const netAmount = amount - fee;

    // Deduct from sender's locked balance
    await client.query(
      `UPDATE user_wallets
       SET locked_balance = locked_balance - $3, updated_at = NOW()
       WHERE user_id = $1 AND asset = $2`,
      [fromUserId, asset, amount]
    );

    // Create sender transaction
    const fromTxResult = await client.query(
      `INSERT INTO wallet_transactions (
        user_id, asset, type, amount, fee, balance_before, balance_after,
        status, reference_type, reference_id, notes
      ) VALUES ($1, $2, 'escrow_transfer', $3, $4, $5, $5, 'completed', 'p2p_order', $6, $7)
      RETURNING *`,
      [fromUserId, asset, amount, fee, senderBefore, orderId, `Released escrow to buyer`]
    );

    // Credit to receiver's available balance
    const receiverWallet = await client.query(
      `SELECT available_balance FROM user_wallets WHERE user_id = $1 AND asset = $2`,
      [toUserId, asset]
    );

    const receiverBefore = receiverWallet.rows[0] ? Number(receiverWallet.rows[0].available_balance) : 0;

    await client.query(
      `INSERT INTO user_wallets (user_id, asset, available_balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, asset) DO UPDATE
       SET available_balance = user_wallets.available_balance + $3, updated_at = NOW()`,
      [toUserId, asset, netAmount]
    );

    // Create receiver transaction
    const toTxResult = await client.query(
      `INSERT INTO wallet_transactions (
        user_id, asset, type, amount, fee, balance_before, balance_after,
        status, reference_type, reference_id, notes
      ) VALUES ($1, $2, 'escrow_release', $3, 0, $4, $5, 'completed', 'p2p_order', $6, $7)
      RETURNING *`,
      [toUserId, asset, netAmount, receiverBefore, receiverBefore + netAmount, orderId, `Received from escrow`]
    );

    return {
      fromTx: fromTxResult.rows[0],
      toTx: toTxResult.rows[0],
    };
  });
}

export async function refundEscrow(
  userId: string,
  asset: string,
  amount: number,
  orderId: string
): Promise<WalletTransaction> {
  return updateBalance(userId, asset, amount, -amount, 'escrow_release', {
    referenceType: 'p2p_order',
    referenceId: orderId,
    notes: `Escrow refunded for cancelled order ${orderId}`,
  });
}

// ============================================
// Deposit Addresses
// ============================================

export async function getDepositAddress(
  userId: string,
  asset: string,
  network: string
): Promise<DepositAddress | null> {
  return queryOne<DepositAddress>(
    `SELECT * FROM deposit_addresses
     WHERE user_id = $1 AND asset = $2 AND network = $3 AND is_active = TRUE`,
    [userId, asset, network]
  );
}

export async function createDepositAddress(
  userId: string,
  asset: string,
  network: string,
  address: string,
  memo?: string
): Promise<DepositAddress> {
  const rows = await query<DepositAddress>(
    `INSERT INTO deposit_addresses (user_id, asset, network, address, memo)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, asset, network) DO UPDATE
     SET address = $4, memo = $5, is_active = TRUE
     RETURNING *`,
    [userId, asset, network, address, memo || null]
  );
  return rows[0];
}

// ============================================
// Transaction History
// ============================================

export async function getTransactionHistory(
  userId: string,
  options: {
    asset?: string;
    type?: WalletTransaction['type'];
    status?: WalletTransaction['status'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: WalletTransaction[]; total: number }> {
  const conditions: string[] = ['user_id = $1'];
  const values: any[] = [userId];
  let paramIndex = 2;

  if (options.asset) {
    conditions.push(`asset = $${paramIndex++}`);
    values.push(options.asset);
  }
  if (options.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(options.type);
  }
  if (options.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(options.status);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM wallet_transactions WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const transactions = await query<WalletTransaction>(
    `SELECT * FROM wallet_transactions
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return { transactions, total };
}

// ============================================
// Supported Assets
// ============================================

export async function getSupportedAssets(onlyActive: boolean = true): Promise<SupportedAsset[]> {
  const condition = onlyActive ? 'WHERE is_active = TRUE' : '';
  return query<SupportedAsset>(
    `SELECT * FROM supported_assets ${condition} ORDER BY symbol`,
    []
  );
}

export async function getAssetInfo(symbol: string): Promise<SupportedAsset | null> {
  return queryOne<SupportedAsset>(
    `SELECT * FROM supported_assets WHERE symbol = $1`,
    [symbol]
  );
}
