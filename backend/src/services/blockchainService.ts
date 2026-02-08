/**
 * Blockchain Service
 * Handles all smart contract interactions for CyxTrade
 *
 * Uses TronWeb for Tron blockchain interactions.
 * Backend creates trades on-chain on behalf of users.
 */

// Note: In production, use 'tronweb' package
// For now, we define types for documentation
// npm install tronweb

// ============ Types ============

export enum TradeState {
  CREATED = 0,
  ACCEPTED = 1,
  USER_PAID = 2,
  DELIVERING = 3,
  COMPLETED = 4,
  DISPUTED = 5,
  RESOLVED = 6,
  CANCELLED = 7,
}

export interface BondState {
  amount: string;       // Total bond in USDT (6 decimals)
  locked: string;       // Locked in active trades
  available: string;    // Available for new trades
  active: boolean;
}

export interface ContractTrade {
  tradeId: string;
  trader: string;
  userId: string;
  sendAmount: string;
  receiveAmount: string;
  bondLocked: string;
  state: TradeState;
  createdAt: number;
  timeout: number;
}

export interface TxReceipt {
  txHash: string;
  success: boolean;
  blockNumber?: number;
  error?: string;
}

// ============ Configuration ============

const config = {
  // Network (from env)
  network: process.env.TRON_NETWORK || 'shasta',

  // Node URLs
  nodes: {
    mainnet: 'https://api.trongrid.io',
    shasta: 'https://api.shasta.trongrid.io',
    nile: 'https://nile.trongrid.io',
  },

  // Contract addresses (set after deployment)
  escrowContract: process.env.ESCROW_CONTRACT || '',
  registryContract: process.env.REGISTRY_CONTRACT || '',
  disputeContract: process.env.DISPUTE_CONTRACT || '',

  // Backend private key (for creating trades)
  privateKey: process.env.TRON_PRIVATE_KEY || '',

  // USDT contract
  usdtContract: process.env.USDT_CONTRACT || '',

  // Timeout for trade (24 hours)
  defaultTimeoutHours: 24,
};

// ============ TronWeb Instance ============

let tronWeb: any = null;
let escrowContract: any = null;
let initialized = false;

/**
 * Initialize TronWeb and load contracts
 */
export async function initBlockchain(): Promise<boolean> {
  if (initialized) return true;

  if (!config.privateKey) {
    console.warn('[Blockchain] No private key configured, blockchain disabled');
    return false;
  }

  if (!config.escrowContract) {
    console.warn('[Blockchain] No escrow contract configured, blockchain disabled');
    return false;
  }

  try {
    // Dynamic import for optional dependency
    const TronWeb = require('tronweb');

    const nodeUrl = (config.nodes as any)[config.network] || config.nodes.shasta;

    tronWeb = new TronWeb({
      fullHost: nodeUrl,
      privateKey: config.privateKey,
    });

    // Load escrow contract ABI
    // Note: In production, load ABI from compiled artifacts
    escrowContract = await tronWeb.contract().at(config.escrowContract);

    initialized = true;
    console.log(`[Blockchain] Initialized on ${config.network}`);
    console.log(`[Blockchain] Escrow: ${config.escrowContract}`);

    return true;
  } catch (error) {
    console.error('[Blockchain] Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if blockchain is available
 */
export function isBlockchainEnabled(): boolean {
  return initialized && !!escrowContract;
}

// ============ Bond Operations (Read-only) ============

/**
 * Get trader's bond balance from contract
 * @param traderAddress Trader's Tron address
 */
export async function getBondBalance(traderAddress: string): Promise<BondState> {
  if (!isBlockchainEnabled()) {
    return { amount: '0', locked: '0', available: '0', active: false };
  }

  try {
    const bond = await escrowContract.getBond(traderAddress).call();

    const amount = bond.amount.toString();
    const locked = bond.locked.toString();
    const available = (BigInt(amount) - BigInt(locked)).toString();

    return {
      amount,
      locked,
      available,
      active: bond.active,
    };
  } catch (error) {
    console.error('[Blockchain] getBondBalance failed:', error);
    throw error;
  }
}

/**
 * Get available bond for a trader
 * @param traderAddress Trader's Tron address
 */
export async function getAvailableBond(traderAddress: string): Promise<string> {
  if (!isBlockchainEnabled()) {
    return '0';
  }

  try {
    const available = await escrowContract.getAvailableBond(traderAddress).call();
    return available.toString();
  } catch (error) {
    console.error('[Blockchain] getAvailableBond failed:', error);
    throw error;
  }
}

// ============ Trade Operations (Backend calls) ============

/**
 * Create a trade on-chain
 * Locks portion of trader's bond
 *
 * @param tradeId Unique trade ID (from database)
 * @param traderAddress Trader's Tron address
 * @param userId User ID hash (for privacy)
 * @param sendAmount Fiat send amount (for record)
 * @param receiveAmount Fiat receive amount (for record)
 * @param bondToLock USDT amount to lock (6 decimals)
 */
export async function createTradeOnChain(
  tradeId: string,
  traderAddress: string,
  userId: string,
  sendAmount: number,
  receiveAmount: number,
  bondToLock: string
): Promise<TxReceipt> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, skipping createTrade');
    return { txHash: '', success: false, error: 'Blockchain not enabled' };
  }

  try {
    // Convert trade ID to bytes32
    const tradeIdBytes = tronWeb.sha3(tradeId);

    // Convert user ID to bytes32 (hash for privacy)
    const userIdBytes = tronWeb.sha3(userId);

    // Calculate timeout (24 hours from now)
    const timeout = Math.floor(Date.now() / 1000) + config.defaultTimeoutHours * 3600;

    // Call contract
    const tx = await escrowContract.createTrade(
      tradeIdBytes,
      traderAddress,
      userIdBytes,
      sendAmount,
      receiveAmount,
      bondToLock,
      timeout
    ).send({
      feeLimit: 100_000_000, // 100 TRX max
    });

    console.log(`[Blockchain] Trade created: ${tx}`);

    return {
      txHash: tx,
      success: true,
    };
  } catch (error: any) {
    console.error('[Blockchain] createTradeOnChain failed:', error);
    return {
      txHash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Update trade state on-chain
 *
 * @param tradeId Trade ID
 * @param newState New trade state
 */
export async function updateTradeStateOnChain(
  tradeId: string,
  newState: TradeState
): Promise<TxReceipt> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, skipping updateTradeState');
    return { txHash: '', success: false, error: 'Blockchain not enabled' };
  }

  try {
    const tradeIdBytes = tronWeb.sha3(tradeId);

    const tx = await escrowContract.updateTradeState(
      tradeIdBytes,
      newState
    ).send({
      feeLimit: 50_000_000,
    });

    console.log(`[Blockchain] Trade state updated to ${TradeState[newState]}: ${tx}`);

    return {
      txHash: tx,
      success: true,
    };
  } catch (error: any) {
    console.error('[Blockchain] updateTradeStateOnChain failed:', error);
    return {
      txHash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Complete a trade on-chain
 * Unlocks trader's bond
 *
 * @param tradeId Trade ID
 */
export async function completeTradeOnChain(tradeId: string): Promise<TxReceipt> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, skipping completeTrade');
    return { txHash: '', success: false, error: 'Blockchain not enabled' };
  }

  try {
    const tradeIdBytes = tronWeb.sha3(tradeId);

    const tx = await escrowContract.completeTrade(tradeIdBytes).send({
      feeLimit: 50_000_000,
    });

    console.log(`[Blockchain] Trade completed: ${tx}`);

    return {
      txHash: tx,
      success: true,
    };
  } catch (error: any) {
    console.error('[Blockchain] completeTradeOnChain failed:', error);
    return {
      txHash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Cancel a trade on-chain
 * Only allowed before USER_PAID
 *
 * @param tradeId Trade ID
 */
export async function cancelTradeOnChain(tradeId: string): Promise<TxReceipt> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, skipping cancelTrade');
    return { txHash: '', success: false, error: 'Blockchain not enabled' };
  }

  try {
    const tradeIdBytes = tronWeb.sha3(tradeId);

    const tx = await escrowContract.cancelTrade(tradeIdBytes).send({
      feeLimit: 50_000_000,
    });

    console.log(`[Blockchain] Trade cancelled: ${tx}`);

    return {
      txHash: tx,
      success: true,
    };
  } catch (error: any) {
    console.error('[Blockchain] cancelTradeOnChain failed:', error);
    return {
      txHash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Open a dispute on-chain
 * Freezes trade for arbitration
 *
 * @param tradeId Trade ID
 */
export async function openDisputeOnChain(tradeId: string): Promise<TxReceipt> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, skipping openDispute');
    return { txHash: '', success: false, error: 'Blockchain not enabled' };
  }

  try {
    const tradeIdBytes = tronWeb.sha3(tradeId);

    const tx = await escrowContract.openDispute(tradeIdBytes).send({
      feeLimit: 50_000_000,
    });

    console.log(`[Blockchain] Dispute opened: ${tx}`);

    return {
      txHash: tx,
      success: true,
    };
  } catch (error: any) {
    console.error('[Blockchain] openDisputeOnChain failed:', error);
    return {
      txHash: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

// ============ Query Operations ============

/**
 * Get trade details from contract
 *
 * @param tradeId Trade ID
 */
export async function getTradeOnChain(tradeId: string): Promise<ContractTrade | null> {
  if (!isBlockchainEnabled()) {
    return null;
  }

  try {
    const tradeIdBytes = tronWeb.sha3(tradeId);
    const trade = await escrowContract.getTrade(tradeIdBytes).call();

    if (trade.trader === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      tradeId: trade.tradeId,
      trader: tronWeb.address.fromHex(trade.trader),
      userId: trade.userId,
      sendAmount: trade.sendAmount.toString(),
      receiveAmount: trade.receiveAmount.toString(),
      bondLocked: trade.bondLocked.toString(),
      state: trade.state,
      createdAt: trade.createdAt.toNumber(),
      timeout: trade.timeout.toNumber(),
    };
  } catch (error) {
    console.error('[Blockchain] getTradeOnChain failed:', error);
    return null;
  }
}

// ============ Utility Functions ============

/**
 * Convert database status to contract state
 */
export function statusToTradeState(status: string): TradeState {
  const mapping: { [key: string]: TradeState } = {
    pending: TradeState.CREATED,
    accepted: TradeState.ACCEPTED,
    paid: TradeState.USER_PAID,
    delivering: TradeState.DELIVERING,
    completed: TradeState.COMPLETED,
    disputed: TradeState.DISPUTED,
    cancelled: TradeState.CANCELLED,
  };
  return mapping[status] ?? TradeState.CREATED;
}

/**
 * Convert contract state to database status
 */
export function tradeStateToStatus(state: TradeState): string {
  const mapping: { [key: number]: string } = {
    [TradeState.CREATED]: 'pending',
    [TradeState.ACCEPTED]: 'accepted',
    [TradeState.USER_PAID]: 'paid',
    [TradeState.DELIVERING]: 'delivering',
    [TradeState.COMPLETED]: 'completed',
    [TradeState.DISPUTED]: 'disputed',
    [TradeState.RESOLVED]: 'completed',
    [TradeState.CANCELLED]: 'cancelled',
  };
  return mapping[state] ?? 'pending';
}

/**
 * Convert amount to USDT decimals (6)
 */
export function toUSDTDecimals(amount: number): string {
  return Math.floor(amount * 1_000_000).toString();
}

/**
 * Convert from USDT decimals to number
 */
export function fromUSDTDecimals(amount: string): number {
  return parseInt(amount, 10) / 1_000_000;
}

// ============ Event Listeners ============

/**
 * Watch for trade events from contract
 * Call this to sync contract state with database
 */
export async function watchTradeEvents(callback: (event: any) => void): Promise<void> {
  if (!isBlockchainEnabled()) {
    console.warn('[Blockchain] Not enabled, event watching disabled');
    return;
  }

  try {
    // TronWeb event watching
    // Note: Implementation depends on TronWeb version
    escrowContract.TradeCreated().watch((err: any, event: any) => {
      if (err) {
        console.error('[Blockchain] Event error:', err);
        return;
      }
      callback({ type: 'TradeCreated', ...event });
    });

    escrowContract.TradeCompleted().watch((err: any, event: any) => {
      if (err) {
        console.error('[Blockchain] Event error:', err);
        return;
      }
      callback({ type: 'TradeCompleted', ...event });
    });

    escrowContract.DisputeOpened().watch((err: any, event: any) => {
      if (err) {
        console.error('[Blockchain] Event error:', err);
        return;
      }
      callback({ type: 'DisputeOpened', ...event });
    });

    console.log('[Blockchain] Event watching started');
  } catch (error) {
    console.error('[Blockchain] Failed to start event watching:', error);
  }
}
