# Bond Escrow: Smart Contract Design

> Non-custodial escrow via smart contracts. No team access. No human custody.

---

## The Core Problem

Who holds the money?

| Option | Problem |
|--------|---------|
| CyxTrade team holds it | Team can steal everything and disappear |
| Trusted escrow nodes | Nodes can collude (3-of-5 = only need 3 corrupt) |
| Single smart contract | Need blockchain, but **no human can steal** |
| User keeps it (honor) | No actual security |

**The honest answer:** If humans hold the money, humans can steal it.

**The solution:** Code holds the money. Smart contracts on public blockchains.

---

## Pure Protocol Model

```
OLD MODEL (Risky):
User deposits → Team/Nodes hold funds → "Trust us"
                      ↓
              They could run away

NEW MODEL (Non-Custodial):
User deposits → Smart Contract → Code enforces custody
                      ↓
              No human can steal (if code is correct)
              Disputes still require human judgment
```

### Who Can Steal?

| Actor | Old Model | New Model |
|-------|-----------|-----------|
| CyxTrade team | YES (has access) | NO (never has access) |
| Escrow nodes | YES (3-of-5 collude) | NO (no nodes) |
| Hackers | Maybe (server breach) | Only if contract bug |
| Government | Can force team | No one to force |

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
        address traderA;
        address traderB;
        uint256 amount;
        TradeState state;
        uint256 createdAt;
        uint256 timeout;
    }

    enum TradeState {
        CREATED,
        LOCKED,
        AWAITING_FIAT_A,
        AWAITING_FIAT_B,
        COMPLETED,
        DISPUTED,
        CANCELLED
    }

    mapping(address => Bond) public bonds;
    mapping(bytes32 => Trade) public trades;

    // Deposit bond (trader calls this)
    function depositBond() external payable;

    // Withdraw bond (only when no active trades)
    function withdrawBond(uint256 amount) external;

    // Create trade (locks portion of bond)
    function createTrade(bytes32 tradeId, address counterparty, uint256 amount) external;

    // Confirm fiat received (both parties must call)
    function confirmFiat(bytes32 tradeId) external;

    // Complete trade (auto-completes if both confirm OR timeout)
    function completeTrade(bytes32 tradeId) external;

    // Open dispute
    function openDispute(bytes32 tradeId) external;

    // Resolve dispute (arbitrators call this)
    function resolveDispute(bytes32 tradeId, address winner) external;
}
```

### Contract Deployment

Deployed on:
- **Tron** (for USDT-TRC20) - Low fees, fast confirmation
- **Ethereum** (for USDT-ERC20) - Higher trust, higher fees
- **Polygon** (for USDC) - Low fees, Ethereum security

Contract is:
- Open source (anyone can audit)
- Verified on block explorer
- Immutable (no admin keys, no upgrades)

---

## Trade Flow (Non-Custodial)

### Step 1: Deposit Bond

```
Trader deposits 1000 USDT to smart contract

1. Trader approves USDT spending: approve(escrowContract, 1000)
2. Trader calls: escrow.depositBond(1000)
3. Contract transfers USDT from trader to itself
4. Contract records: bonds[trader] = {amount: 1000, locked: 0, active: true}

Trader now has 1000 USDT bond capacity.
No human ever touched the funds.
```

### Step 2: Create Trade

```
Trader A wants to trade 500 USDT with Trader B

1. Trader A calls: escrow.createTrade(tradeId, traderB, 500)
2. Contract checks: bonds[traderA].amount - bonds[traderA].locked >= 500
3. Contract locks: bonds[traderA].locked += 500
4. Contract creates trade: trades[tradeId] = {...}
5. Trade state: LOCKED

Trader A's bond: 1000 total, 500 locked, 500 available.
```

### Step 3: Fiat Exchange (Off-Chain)

```
This happens OUTSIDE the blockchain:

1. Trader A sends fiat to Trader B (bank transfer, mobile money, cash)
2. Trader B receives fiat
3. Trader B sends fiat to end recipient

The contract CANNOT verify this happened.
We rely on:
- Both parties confirming
- Timeout with default behavior
- Arbitration for disputes
```

### Step 4: Confirm and Complete

```
Happy path: Both traders confirm

1. Trader A calls: escrow.confirmFiat(tradeId)
2. Trader B calls: escrow.confirmFiat(tradeId)
3. Contract sees both confirmed
4. Contract unlocks: bonds[traderA].locked -= 500
5. Trade state: COMPLETED

Alternative: Timeout

1. Trade created with 48h timeout
2. Neither party disputes within 48h
3. Contract auto-completes: escrow.completeTrade(tradeId)
4. Funds unlocked
```

### Step 5: Dispute (If Needed)

```
Trader B claims fiat never received

1. Trader B calls: escrow.openDispute(tradeId)
2. Trade state: DISPUTED
3. Funds remain locked
4. Arbitration process begins (see below)
5. Arbitrators vote
6. Winner gets funds / loser loses bond portion
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

*(To be deployed)*

| Chain | Contract | Status |
|-------|----------|--------|
| Tron | `TBD...` | Pending |
| Ethereum | `0xTBD...` | Pending |
| Polygon | `0xTBD...` | Pending |

All contracts will be:
- Verified source on explorer
- Audited by [TBD]
- No admin functions
- No upgrade mechanism

---

## Trade State Machine

```
                    ┌─────────────┐
                    │   CREATED   │
                    └──────┬──────┘
                           │ Both parties lock bond
                           ▼
                    ┌─────────────┐
                    │   LOCKED    │
                    └──────┬──────┘
                           │ Fiat exchange begins
                           ▼
                    ┌─────────────┐
                    │ AWAITING    │
                    │ FIAT        │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ COMPLETED│ │ DISPUTED │ │ TIMEOUT  │
       └──────────┘ └────┬─────┘ └────┬─────┘
                         │            │
                         ▼            ▼
                  ┌──────────┐ ┌──────────┐
                  │ RESOLVED │ │ AUTO     │
                  │ (winner) │ │ COMPLETE │
                  └──────────┘ └──────────┘
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
| **No custody** | Smart contract holds all funds |
| **No custody trust** | Code enforces custody rules |
| **Transparent** | Contract is open source, verified |
| **Immutable** | No admin keys, no upgrades |
| **Arbitration** | Community arbitrators with stake |

**The CyxTrade team never touches your money.**

Not because we're trustworthy.

Because we literally can't.

---

*Last updated: 2025-02*
