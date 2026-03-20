import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../../middleware/auth';
import { requireTotpVerification } from '../../middleware/totpMiddleware';
import {
  getAllWallets,
  getWalletBalance,
  getOrCreateWallet,
  getDepositAddress,
  createDepositAddress,
  requestWithdrawal,
  cancelWithdrawal,
  getTransactionHistory,
  getSupportedAssets,
  getAssetInfo,
} from '../../services/walletService';
import { AppError, ErrorCode } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// Helper to ensure param is string
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// ============================================
// Supported Assets (Public)
// ============================================

// GET /api/pro/wallet/assets - List supported assets
router.get('/assets', asyncHandler(async (req, res) => {
  const assets = await getSupportedAssets();

  sendSuccess(res, {
    assets: assets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      network: a.network,
      decimals: a.decimals,
      minDeposit: a.min_deposit,
      minWithdrawal: a.min_withdrawal,
      withdrawalFee: a.withdrawal_fee,
      isFiat: a.is_fiat,
      iconUrl: a.icon_url,
    })),
  });
}));

// GET /api/pro/wallet/assets/:symbol - Get asset info
router.get('/assets/:symbol', asyncHandler(async (req, res) => {
  const symbol = getParam(req.params.symbol).toUpperCase();
  const asset = await getAssetInfo(symbol);

  if (!asset) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Asset not found');
  }

  sendSuccess(res, {
    symbol: asset.symbol,
    name: asset.name,
    network: asset.network,
    contractAddress: asset.contract_address,
    decimals: asset.decimals,
    minDeposit: asset.min_deposit,
    minWithdrawal: asset.min_withdrawal,
    withdrawalFee: asset.withdrawal_fee,
    isFiat: asset.is_fiat,
    iconUrl: asset.icon_url,
  });
}));

// ============================================
// User Wallet Routes (Auth Required)
// ============================================

// GET /api/pro/wallet/balances - Get all wallet balances
router.get('/balances', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const wallets = await getAllWallets(userId);

  sendSuccess(res, {
    wallets: wallets.map((w) => ({
      asset: w.asset,
      available: Number(w.available_balance),
      locked: Number(w.locked_balance),
      total: Number(w.available_balance) + Number(w.locked_balance),
      totalDeposited: Number(w.total_deposited),
      totalWithdrawn: Number(w.total_withdrawn),
    })),
  });
}));

// GET /api/pro/wallet/balance/:asset - Get single asset balance
router.get('/balance/:asset', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const asset = getParam(req.params.asset).toUpperCase();
  const balance = await getWalletBalance(userId, asset);

  sendSuccess(res, {
    asset,
    available: balance.available,
    locked: balance.locked,
    total: balance.total,
  });
}));

// POST /api/pro/wallet/init/:asset - Initialize wallet for asset
router.post('/init/:asset', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const asset = getParam(req.params.asset).toUpperCase();

  // Verify asset is supported
  const assetInfo = await getAssetInfo(asset);
  if (!assetInfo || !assetInfo.is_active) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Asset not supported');
  }

  const wallet = await getOrCreateWallet(userId, asset);

  sendSuccess(res, {
    asset: wallet.asset,
    available: Number(wallet.available_balance),
    locked: Number(wallet.locked_balance),
    created: true,
  }, 201);
}));

// ============================================
// Deposit Routes
// ============================================

// GET /api/pro/wallet/deposit/:asset - Get deposit address
router.get('/deposit/:asset', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const asset = getParam(req.params.asset).toUpperCase();
  const network = (req.query.network as string) || 'TRC20';

  // Verify asset is supported
  const assetInfo = await getAssetInfo(asset);
  if (!assetInfo || !assetInfo.is_active) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Asset not supported');
  }

  let depositAddress = await getDepositAddress(userId, asset, network);

  if (!depositAddress) {
    // In production, generate address via blockchain service
    // For now, return a placeholder response indicating address needs to be generated
    sendSuccess(res, {
      asset,
      network,
      address: null,
      memo: null,
      message: 'Deposit address not yet generated. Please contact support.',
      minDeposit: assetInfo.min_deposit,
    });
    return;
  }

  sendSuccess(res, {
    asset,
    network,
    address: depositAddress.address,
    memo: depositAddress.memo,
    minDeposit: assetInfo.min_deposit,
  });
}));

// POST /api/pro/wallet/deposit/:asset/address - Generate deposit address (admin/system)
router.post('/deposit/:asset/address', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const asset = getParam(req.params.asset).toUpperCase();
  const { network, address, memo } = req.body;

  if (!address) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Address is required', { field: 'address' });
  }

  // In production, this would be called by the system after generating an address
  // For development, allow manual address registration
  const depositAddress = await createDepositAddress(
    userId,
    asset,
    network || 'TRC20',
    address,
    memo
  );

  sendSuccess(res, {
    asset: depositAddress.asset,
    network: depositAddress.network,
    address: depositAddress.address,
    memo: depositAddress.memo,
  }, 201);
}));

// ============================================
// Withdrawal Routes
// ============================================

// POST /api/pro/wallet/withdraw - Request withdrawal (TOTP protected)
router.post('/withdraw', authMiddleware, requireTotpVerification('withdrawal'), asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { asset, amount, address, network } = req.body;

  if (!asset) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Asset is required', { field: 'asset' });
  }
  if (!amount || amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }
  if (!address) {
    throw new AppError(ErrorCode.MISSING_FIELD, 'Withdrawal address is required', { field: 'address' });
  }

  const tx = await requestWithdrawal(
    userId,
    asset.toUpperCase(),
    amount,
    address,
    network || 'TRC20'
  );

  sendSuccess(res, {
    transactionId: tx.id,
    asset: tx.asset,
    amount: tx.amount,
    fee: tx.fee,
    totalDebit: Number(tx.amount) + Number(tx.fee),
    address: tx.to_address,
    network: tx.network,
    status: tx.status,
    message: 'Withdrawal request submitted. Processing may take 10-30 minutes.',
  }, 201);
}));

// DELETE /api/pro/wallet/withdraw/:id - Cancel pending withdrawal
router.delete('/withdraw/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const txId = getParam(req.params.id);

  // Verify transaction belongs to user before cancelling
  const transactions = await getTransactionHistory(userId, { limit: 100 });
  const tx = transactions.transactions.find((t) => t.id === txId);

  if (!tx) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Transaction not found');
  }

  if (tx.status !== 'pending') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only pending withdrawals can be cancelled');
  }

  await cancelWithdrawal(txId, 'User cancelled');

  sendSuccess(res, { message: 'Withdrawal cancelled' });
}));

// ============================================
// Transaction History
// ============================================

// GET /api/pro/wallet/transactions - Get transaction history
router.get('/transactions', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const { asset, type, status, limit, offset } = req.query;

  const result = await getTransactionHistory(userId, {
    asset: asset ? (asset as string).toUpperCase() : undefined,
    type: type as any,
    status: status as any,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    transactions: result.transactions.map((tx) => ({
      id: tx.id,
      asset: tx.asset,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      balanceBefore: tx.balance_before,
      balanceAfter: tx.balance_after,
      status: tx.status,
      txHash: tx.tx_hash,
      fromAddress: tx.from_address,
      toAddress: tx.to_address,
      network: tx.network,
      confirmations: tx.confirmations,
      requiredConfirmations: tx.required_confirmations,
      notes: tx.notes,
      createdAt: tx.created_at,
      completedAt: tx.completed_at,
    })),
    total: result.total,
  });
}));

// GET /api/pro/wallet/transactions/:asset - Get transactions for specific asset
router.get('/transactions/:asset', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED);
  }

  const asset = getParam(req.params.asset).toUpperCase();
  const { type, status, limit, offset } = req.query;

  const result = await getTransactionHistory(userId, {
    asset,
    type: type as any,
    status: status as any,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  sendSuccess(res, {
    asset,
    transactions: result.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee,
      balanceAfter: tx.balance_after,
      status: tx.status,
      txHash: tx.tx_hash,
      createdAt: tx.created_at,
    })),
    total: result.total,
  });
}));

export default router;
