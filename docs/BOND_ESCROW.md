# Bond Escrow: Smart Contract Design

> Traders deposit bonds. Users don't need crypto. Backend creates trades on-chain.

---

## The Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOW IT WORKS                                    │
│                                                                             │
│   TRADERS deposit USDT bonds to smart contract                              │
│   USERS create trades via app (no wallet needed)                            │
│   BACKEND locks portion of trader's bond when trade starts                  │
│   If trader delivers → bond unlocked                                        │
│   If trader scams → bond slashed, user compensated                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Who Has What

| Actor | Has Wallet? | Interacts with Contract? |
|-------|-------------|--------------------------|
| **User** | NO | No - uses app only |
| **Trader** | YES | Yes - deposits/withdraws bond |
| **Backend** | YES (system key) | Yes - creates trades, locks bonds |
| **Arbitrator** | YES | Yes - votes on disputes |

### Who Can Steal?

| Actor | Can Steal Trader Bonds? | Why? |
|-------|-------------------------|------|
| CyxTrade team | NO | Contract has no admin functions |
| Backend | NO | Can lock bonds, can't withdraw them |
| Hackers | Only if contract bug | No server holds funds |
| Traders | Only their own | Each trader controls their wallet |

---

## Smart Contract Architecture

### Contract Overview

```solidity
// CyxTrade Escrow Contract (simplified)
contract CyxTradeEscrow {

    struct Bond {
        address trader;
        uint256 amount;
        uint256 lockedAmount;
        bool active;
    }

    struct Trade {
        bytes32 tradeId;
        address trader;           // The trader handling this trade
        bytes32 oderId;          // Reference to off-chain user
        uint256 sendAmount;       // Fiat amount user sends (e.g., 1000 AED)
        uint256 receiveAmount;    // Fiat amount recipient gets (e.g., 163000 XAF)
        uint256 bondLocked;       // USDT locked from trader's bond
        TradeState state;
        uint256 createdAt;
        uint256 timeout;
    }

    enum TradeState {
        CREATED,        // Trade initiated, bond locked
        ACCEPTED,       // Trader accepted
        USER_PAID,      // User confirms sent fiat to trader
        DELIVERING,     // Trader confirms received, sending to recipient
        COMPLETED,      // User confirms recipient received
        DISPUTED,       // Dispute opened
        RESOLVED,       // Dispute resolved
        CANCELLED       // Cancelled before USER_PAID
    }

    mapping(address => Bond) public bonds;
    mapping(bytes32 => Trade) public trades;

    address public backend;  // Backend address that can create trades

    // === TRADER FUNCTIONS ===

    // Deposit bond (trader calls this directly)
    function depositBond() external payable;

    // Withdraw bond (only when no active trades)
    function withdrawBond(uint256 amount) external;

    // === BACKEND FUNCTIONS ===

    // Create trade on behalf of user (backend calls this)
    function createTrade(
        bytes32 tradeId,
        address trader,
        bytes32 userId,
        uint256 sendAmount,
        uint256 receiveAmount,
        uint256 bondToLock
    ) external onlyBackend;

    // Update trade state (backend calls this)
    function updateTradeState(bytes32 tradeId, TradeState newState) external onlyBackend;

    // Complete trade - unlocks bond (backend calls this)
    function completeTrade(bytes32 tradeId) external onlyBackend;

    // Open dispute (backend calls this)
    function openDispute(bytes32 tradeId) external onlyBackend;

    // === ARBITRATOR FUNCTIONS ===

    // Resolve dispute (arbitrators vote, then this executes)
    function resolveDispute(bytes32 tradeId, bool favorUser) external;
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Backend can create trades | Users don't have wallets |
| Backend CAN'T withdraw bonds | Only trader's wallet can withdraw |
| Bond locked per trade | Protects user for that specific trade |
| Arbitrators resolve disputes | Fiat can't be verified on-chain |

### Contract Deployment

**MVP: Tron only** (USDT-TRC20)
- Low fees (~$1 per transaction)
- Fast confirmation (~3 seconds)
- High USDT liquidity

Contract is:
- Open source (anyone can audit)
- Verified on TronScan
- Immutable (no admin keys, no upgrades)
- Backend address set at deployment (can't be changed)

---

## Trade Flow

### Step 1: Trader Deposits Bond

```
Trader deposits 5000 USDT to smart contract

1. Trader connects wallet (TronLink, etc.)
2. Trader approves USDT spending: approve(escrowContract, 5000)
3. Trader calls: escrow.depositBond(5000)
4. Contract transfers USDT from trader to itself
5. Contract records: bonds[trader] = {amount: 5000, locked: 0, active: true}

Trader now has 5000 USDT bond capacity.
Can accept trades up to their available bond.
```

### Step 2: User Creates Trade (Via App)

```
Ali wants to send 1000 AED to Marie in Cameroon

1. Ali opens app, enters: 1000 AED → Marie (Cameroon)
2. App shows available traders, Ali selects one
3. Ali confirms trade
4. Backend calls: escrow.createTrade(tradeId, traderAddr, oderId, 1000, 163000, 165)
5. Contract locks 165 USDT from trader's bond
6. Trade state: CREATED

Trader's bond: 5000 total, 165 locked, 4835 available.
Ali doesn't need a wallet - backend handled it.
```

### Step 3: Fiat Exchange (Off-Chain)

```
This happens OUTSIDE the blockchain:

1. Trader accepts trade in app
   └── Backend updates state to ACCEPTED

2. Ali sends 1000 AED to trader's bank account
   └── Ali clicks "I Paid" in app
   └── Backend updates state to USER_PAID

3. Trader receives AED, sends 163,000 XAF to Marie
   └── Trader clicks "Delivered" in app
   └── Backend updates state to DELIVERING

4. Ali confirms with Marie she received money
   └── Ali clicks "Confirm Receipt" in app
   └── Backend calls: escrow.completeTrade(tradeId)
   └── Contract unlocks trader's bond
   └── Trade state: COMPLETED

The contract CANNOT verify fiat transfers.
It relies on user confirmation or dispute resolution.
```

### Step 4: Dispute (If Needed)

```
Ali claims Marie never received money

1. Ali clicks "Open Dispute" in app
2. Backend calls: escrow.openDispute(tradeId)
3. Trade state: DISPUTED
4. Trader's bond remains locked
5. Both parties submit evidence (screenshots, receipts)
6. Arbitrators review and vote
7. Contract executes result:
   - If Ali wins: Trader's locked bond sent to compensation address
   - If Trader wins: Bond unlocked, trade cancelled
```

---

## Arbitration System

### The Fiat Verification Problem

Smart contracts can verify crypto (on-chain), but cannot verify fiat (off-chain).

```
Crypto: Contract can see: "500 USDT transferred from A to B" ✓
Fiat: Contract CANNOT see: "500 AED transferred via bank" ✗
```

Someone must attest that fiat was sent/received.

### Arbitrator Design

```
Arbitrators are:
├── Community members with high reputation
├── Staked (deposit bond to become arbitrator)
├── Randomly selected for each dispute
├── Multiple arbitrators vote (3-of-5 or 5-of-7)
└── Slashed if voting pattern is corrupt
```

### Arbitrator Selection

```solidity
contract ArbitratorRegistry {

    struct Arbitrator {
        address addr;
        uint256 stake;          // Must stake 500+ USDT
        uint256 reputation;     // Earned from correct votes
        uint256 disputesHandled;
        bool active;
    }

    // Random selection using block hash + trade ID
    function selectArbitrators(bytes32 tradeId, uint256 count)
        external view returns (address[] memory)
    {
        // Pseudo-random selection weighted by reputation
        // Cannot be gamed because block hash is unknown
    }

    // Slash arbitrator for corruption
    function slashArbitrator(address arb, bytes32 evidence) external;
}
```

### Dispute Resolution Flow

```
1. Dispute opened
   └── Trade locked, arbitrators selected (5 random)

2. Evidence period (48h)
   ├── Trader A submits: payment screenshots, bank ref, timestamps
   ├── Trader B submits: bank statement, denial evidence
   └── Evidence stored on IPFS, hash on-chain

3. Voting period (48h)
   ├── Each arbitrator reviews evidence
   ├── Each arbitrator votes: FAVOR_A / FAVOR_B / INCONCLUSIVE
   └── Votes are hidden until period ends (commit-reveal)

4. Resolution
   ├── Majority wins (3-of-5)
   ├── Winner: Gets trade amount from loser's bond
   ├── Loser: Bond slashed by trade amount
   ├── Arbitrators: Get small fee (0.1% of trade)
   └── If INCONCLUSIVE majority: Split 50/50, both pay small fee
```

### Arbitrator Incentives

| Behavior | Consequence |
|----------|-------------|
| Vote with majority | +1 reputation, +0.1% fee share |
| Vote against majority | 0 reputation change, no fee |
| Don't vote (timeout) | -5 reputation, small slash |
| Provably corrupt | Full slash (lose entire stake) |

### Corruption Prevention

```
How do we prevent arbitrator corruption?

1. RANDOM SELECTION
   - Can't know who will be selected
   - Can't bribe in advance

2. MULTIPLE ARBITRATORS
   - Need to corrupt 3+ of 5
   - Expensive and risky

3. STAKE AT RISK
   - Each arbitrator has 500+ USDT staked
   - Corrupt voting = lose stake

4. REPUTATION TRANSPARENCY
   - All votes are public (after reveal)
   - Patterns are visible (always votes for same trader = sus)

5. META-ARBITRATION
   - Disputed arbitrator decisions can be appealed
   - Larger panel (7-of-11) reviews
   - Corrupt arbitrators slashed
```

---

## Bond Management

### Deposit Flow

```
Trader wants to deposit 1000 USDT bond:

1. Connect wallet (MetaMask, TronLink, etc.)
2. Approve USDT spending for escrow contract
3. Call depositBond(1000)
4. Transaction confirmed
5. Bond active in contract

No trust required. Trader verified on block explorer.
```

### Withdrawal Flow

```
Trader wants to withdraw bond:

1. Check: No active trades (locked == 0)
2. Check: No pending disputes
3. Call withdrawBond(1000)
4. Contract transfers USDT back to trader
5. Bond removed

Withdrawal is INSTANT when conditions met.
No approval needed from anyone.
```

### Bond Locking Logic

```solidity
// Simplified locking logic

function lockBond(address trader, uint256 amount) internal {
    require(bonds[trader].active, "No bond");
    require(
        bonds[trader].amount - bonds[trader].locked >= amount,
        "Insufficient available bond"
    );
    bonds[trader].locked += amount;
}

function unlockBond(address trader, uint256 amount) internal {
    require(bonds[trader].locked >= amount, "Nothing to unlock");
    bonds[trader].locked -= amount;
}

function slashBond(address trader, address recipient, uint256 amount) internal {
    require(bonds[trader].amount >= amount, "Insufficient bond");
    bonds[trader].amount -= amount;
    bonds[trader].locked -= min(bonds[trader].locked, amount);

    // Transfer slashed amount to recipient
    USDT.transfer(recipient, amount);
}
```

---

## Security Analysis

### What Could Go Wrong?

| Risk | Mitigation |
|------|------------|
| Smart contract bug | Audits, formal verification, bug bounty |
| Arbitrator collusion | Random selection, stake at risk, multiple parties |
| Blockchain congestion | Multiple chains supported |
| USDT blacklisting | Use USDC as backup, or DAI |
| Oracle manipulation | No oracles needed (fiat verified by attestation) |

### What CAN'T Go Wrong?

| Attack | Why It Fails |
|--------|--------------|
| Team steals funds | Team never has access |
| Server hacked | No server holds funds |
| Government seizure | No entity to seize from |
| Rug pull | Contract is immutable |

---

## Contract Addresses

### Shasta Testnet (Deployed 2026-02-08)

| Contract | Address | Purpose |
|----------|---------|---------|
| CyxTradeEscrow | `TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm` | Main escrow, holds bonds |
| ArbitratorRegistry | `TG5FQEiDTSJKYKCf44GnkpckvazBNabbxo` | Arbitrator staking |
| DisputeResolution | `TKvov2ThwCmxQ2RrFbZi5nMYJNKrLYoPAM` | Dispute voting |
| MockUSDT | `TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn` | Test token (Shasta only) |

View on Tronscan: https://shasta.tronscan.org/#/contract/TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm

### Mainnet (Pending)

| Chain | Contract | Status |
|-------|----------|--------|
| Tron | `TBD` | Pending audit |

All contracts are:
- Open source (verified on explorer)
- No admin functions
- No upgrade mechanism
- Immutable once deployed

---

## Trade State Machine

```
                    ┌─────────────┐
                    │   CREATED   │ User creates trade, bond locked
                    └──────┬──────┘
                           │ Trader accepts
                           ▼
                    ┌─────────────┐
                    │  ACCEPTED   │ Trader sends payment details
                    └──────┬──────┘
                           │ User sends fiat to trader
                           ▼
                    ┌─────────────┐
                    │  USER_PAID  │ User confirms sent payment
                    └──────┬──────┘
                           │ Trader receives, sends to recipient
                           ▼
                    ┌─────────────┐
                    │ DELIVERING  │ Trader confirms sending to recipient
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  COMPLETED  │          │  DISPUTED   │
       │ Bond unlock │          │ Bond frozen │
       └─────────────┘          └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │  RESOLVED   │
                                │ Winner gets │
                                │    bond     │
                                └─────────────┘

    CANCELLED: Can happen before USER_PAID
    TIMEOUT: Auto-dispute after 24h inactivity in any state
```

---

## Why Smart Contracts?

| Question | Answer |
|----------|--------|
| Why not MPC nodes? | Nodes are humans. Humans can collude. |
| Why not the team? | Team is anonymous. Could disappear. |
| Why not banks? | Banks require KYC. Defeats purpose. |
| Why smart contracts? | Code is law. No humans in custody. |

### The Bisq Precedent

Bisq (Bitcoin P2P exchange) has operated since 2014:
- No central custody
- 2-of-2 multisig + deposit
- Arbitration for disputes
- Never hacked, never rug-pulled

CyxTrade follows the same model, adapted for stablecoins.

---

## Summary

| Principle | Implementation |
|-----------|----------------|
| **Users don't need crypto** | Backend creates trades on their behalf |
| **Traders stake bonds** | USDT deposited to smart contract |
| **Users protected** | Trader's bond locked per trade |
| **Backend can't steal** | Contract has no admin withdrawal |
| **Disputes are human** | Arbitrators judge fiat (not trustless) |

### Who Can Do What

| Actor | Deposit Bond | Withdraw Bond | Create Trade | Complete Trade | Resolve Dispute |
|-------|--------------|---------------|--------------|----------------|-----------------|
| User | - | - | Via app | Via app | Via app |
| Trader | YES | YES (own only) | - | - | - |
| Backend | - | NO | YES | YES | YES (trigger) |
| Arbitrator | - | - | - | - | YES (vote) |

**Key insight:**
- Users are protected by trader bonds
- Traders are protected by dispute resolution
- Backend facilitates but can't steal
- Contract enforces rules automatically

---

*Last updated: 2026-02*
